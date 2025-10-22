import React, { useEffect, useState } from "react";
import { Table, Input, Button, Tag, message, Modal, Skeleton } from "antd";
import {
  DownloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileImageOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import ResidentNavbar from "./ResidentNavbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function iconFor(mime) {
  if (/pdf$/i.test(mime)) return <FilePdfOutlined className="text-red-600" />;
  if (/word|docx?|officedocument\.word/i.test(mime))
    return <FileWordOutlined className="text-blue-600" />;
  if (/image/i.test(mime)) return <FileImageOutlined className="text-green-600" />;
  return <FileTextOutlined className="text-gray-500" />;
}

export default function ResidentPublicDocuments() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${baseURL}/api/resident/public-documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocs(res.data);
    } catch {
      message.error("Failed to load documents");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const openPreview = async (record) => {
    setPreviewDoc(record);
    setPreviewOpen(true);
    setPreviewLoading(true);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${baseURL}/api/resident/public-documents/${record._id}/preview`,
        {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const blobUrl = URL.createObjectURL(res.data);
      setPreviewUrl(blobUrl);
    } catch {
      message.error("Preview not available");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const filtered = docs.filter(d =>
    [d.title, d.description, d.category, d.originalName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const download = async record => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${baseURL}/api/resident/public-documents/${record._id}/download`,
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

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (v, r) => (
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => openPreview(r)}
        >
          {iconFor(r.mimeType)}
          <span className="font-medium hover:underline">{v}</span>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: v => <Tag>{v || "General"}</Tag>,
    },
    {
      title: "Uploaded",
      dataIndex: "createdAt",
      key: "createdAt",
      render: v => dayjs(v).format("YYYY-MM-DD"),
      sorter: (a, b) =>
        new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
      defaultSortOrder: "descend",
    },
    {
      title: "Action",
      key: "action",
      render: (_, r) => (
        <div className="flex gap-2">
          <Button
            size="small"
            type="default"
            onClick={() => openPreview(r)}
            className="shadow-sm"
          >
            View
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => download(r)}
            className="shadow-sm bg-blue-600 hover:bg-blue-700"
          >
            Download
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <ResidentNavbar />
      <main className="mx-auto w-full max-w-9xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="w-full">
          <CardHeader className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl font-semibold text-slate-900">Public Documents</CardTitle>
              <CardDescription>
                View and download official barangay public documents
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Input.Search
                placeholder="Search documents"
                allowClear
                value={search}
                onChange={e => setSearch(e.target.value)}
                onSearch={v => setSearch(v.trim())}
                className="max-w-xs"
              />
            </div>
          </CardHeader>
        </Card>

        <Card className="w-full">
          <CardContent className="space-y-6">
            <Table
              rowKey="_id"
              loading={loading}
              dataSource={filtered}
              columns={columns}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 700 }}
            />
          </CardContent>
        </Card>
      </main>

      <Modal
        title={
          <div className="text-lg font-semibold text-slate-900">
            {previewDoc ? `Preview: ${previewDoc.title}` : "Preview"}
          </div>
        }
        open={previewOpen}
        onCancel={() => {
          setPreviewOpen(false);
          setPreviewDoc(null);
        }}
        footer={null}
        className="top-4"
        width={900}
        className="top-4"
        bodyStyle={{ height: "75vh", display: "flex", flexDirection: "column" }}
      >
        {previewLoading && <Skeleton active />}
        {!previewLoading && previewDoc && previewUrl && (
          <>
            {/^application\/pdf/i.test(previewDoc.mimeType) && (
              <iframe
                src={previewUrl}
                title="PDF Preview"
                className="flex-1 w-full border rounded"
              />
            )}
            {/^image\//i.test(previewDoc.mimeType) && (
              <div className="flex-1 overflow-auto flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt={previewDoc.title}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
            {!/^application\/pdf/i.test(previewDoc.mimeType) &&
              !/^image\//i.test(previewDoc.mimeType) && (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-600">
                  <FileTextOutlined className="text-4xl mb-3" />
                  <p>No inline preview for this file type.</p>
                  <Button
                    type="primary"
                    className="mt-2 shadow-sm bg-blue-600 hover:bg-blue-700"
                    icon={<DownloadOutlined />}
                    onClick={() => download(previewDoc)}
                  >
                    Download
                  </Button>
                </div>
              )}
          </>
        )}
      </Modal>
    </div>
  );
}