import React, { useEffect, useState, useRef } from "react";
import { Table, Input, Button, Tag, message, Skeleton, Modal } from "antd";
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
import { renderAsync } from "docx-preview";

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
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewBlob, setPreviewBlob] = useState(null);
  const docxContainerRef = useRef(null);

  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const STATUS_COLORS = {
    verified: 'green',
    edited: 'orange',
    deleted: 'red',
    not_registered: 'default',
    error: 'volcano'
  };

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
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind md breakpoint
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const openPreview = async (record) => {
    setPreviewDoc(record);
    setPreviewLoading(true);
    // clear previous docx HTML if any
    if (docxContainerRef.current) {
      docxContainerRef.current.innerHTML = "";
    }
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
      const blob = res.data;
      const blobUrl = URL.createObjectURL(blob);
      setPreviewUrl(blobUrl);
      setPreviewBlob(blob);
    } catch {
      message.error("Preview not available");
    } finally {
      setPreviewLoading(false);
      if (isMobile) setShowPreviewModal(true);
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
      title: "Blockchain Status",
      dataIndex: "status",
      key: "status",
      render: (v) => (
        <Tag color={STATUS_COLORS[v] || 'default'} className="uppercase tracking-wide">
          {v === 'not_registered' ? 'UNREGISTERED' : (v || 'N/A').toUpperCase()}
        </Tag>
      ),
      filters: ['verified','edited','deleted','not_registered','error'].map(s => ({ text: s.toUpperCase(), value: s })),
      onFilter: (value, record) => record.status === value,
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

  const renderPreviewContent = () => {
    if (!previewDoc) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          Choose a document to preview.
        </div>
      );
    }
    return (
      <div className="flex-1 min-h-0">
        {previewLoading && <Skeleton active />}
        {!previewLoading && (
          <>
            {previewDoc.status === 'deleted' && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                This document has been deleted. Preview or download may be limited.
              </div>
            )}
            {previewUrl && (
              <>
            {/officedocument\\.wordprocessingml\\.document|msword|vnd\\.openxmlformats-officedocument\\.wordprocessingml\\.document/i.test(previewDoc.mimeType || "") && (
              <div className="w-full overflow-hidden rounded-md border bg-white">
                <div
                  ref={docxContainerRef}
                  className="docx-wrapper px-4 py-4 max-h-[65vh] md:max-h-[70vh] overflow-auto"
                />
              </div>
            )}
            {/^application\/pdf/i.test(previewDoc.mimeType) && (
              <div className="w-full h-full overflow-hidden rounded-md border">
                <iframe
                  src={previewUrl}
                  title="PDF Preview"
                  className="w-full h-[65vh] md:h-[70vh]"
                />
              </div>
            )}
            {/^image\//i.test(previewDoc.mimeType) && (
              <div className="w-full h-full overflow-hidden rounded-md border bg-white flex items-center justify-center p-2">
                <img
                  src={previewUrl}
                  alt={previewDoc.title}
                  className="block max-h-[65vh] md:max-h-[70vh] max-w-full object-contain"
                />
              </div>
            )}
            {!/^application\/pdf/i.test(previewDoc.mimeType) &&
              !/^image\//i.test(previewDoc.mimeType) &&
              !(/officedocument\\.wordprocessingml\\.document|msword|vnd\\.openxmlformats-officedocument\\.wordprocessingml\\.document/i.test(previewDoc.mimeType || "")) && (
                <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-600">
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
          </>
        )}
      </div>
    );
  };

  // Render DOCX when applicable
  useEffect(() => {
    const isDocx = /officedocument\.wordprocessingml\.document|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document/i.test(
      previewDoc?.mimeType || ""
    );
    if (!isDocx || !previewBlob || !docxContainerRef.current) return;
    // Clear previous content
    docxContainerRef.current.innerHTML = "";
    renderAsync(previewBlob, docxContainerRef.current, {
      className: "docx",
      inWrapper: true,
      ignoreLastRenderedPageBreak: true,
      experimental: true,
    }).catch(() => {
      // Silent fallback: if rendering fails, keep the download option
    });
    // Cleanup not strictly required as we replace innerHTML on next render
  }, [previewBlob, previewDoc]);

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

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="w-full lg:col-span-5">
            <CardContent className="space-y-6 pt-6">
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
          {/* Desktop / large screen side preview */}
          <Card className="w-full lg:col-span-7 hidden md:block">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-xl truncate">
                    {previewDoc ? previewDoc.title : "Select a document to preview"}
                  </CardTitle>
                  {previewDoc && (
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                      <Tag>{previewDoc.category || "General"}</Tag>
                      {previewDoc.status && (
                        <Tag color={STATUS_COLORS[previewDoc.status] || 'default'} className="uppercase">
                          {previewDoc.status === 'not_registered' ? 'UNREGISTERED' : previewDoc.status.toUpperCase()}
                        </Tag>
                      )}
                      <span>
                        Uploaded {dayjs(previewDoc.createdAt).format("YYYY-MM-DD")}
                      </span>
                    </div>
                  )}
                </div>
                {previewDoc && (
                  <div className="shrink-0">
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => download(previewDoc)}
                      className="shadow-sm bg-blue-600 hover:bg-blue-700"
                      icon={<DownloadOutlined />}
                    >
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[65vh] md:h-[70vh] flex flex-col min-h-0">
                {renderPreviewContent()}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Modal
        open={showPreviewModal && isMobile}
        onCancel={() => {
          setShowPreviewModal(false);
          setPreviewDoc(null);
          if (docxContainerRef.current) {
            docxContainerRef.current.innerHTML = "";
          }
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
          setPreviewBlob(null);
        }}
        footer={null}
        width="95%"
        centered
        title={previewDoc ? previewDoc.title : 'Document Preview'}
        destroyOnClose
        bodyStyle={{ maxHeight: '75vh', overflowY: 'auto' }}
      >
        <div className="space-y-4">
          {previewDoc && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <Tag>{previewDoc.category || 'General'}</Tag>
              {previewDoc.status && (
                <Tag color={STATUS_COLORS[previewDoc.status] || 'default'} className="uppercase">
                  {previewDoc.status === 'not_registered' ? 'UNREGISTERED' : previewDoc.status.toUpperCase()}
                </Tag>
              )}
              <span>Uploaded {dayjs(previewDoc.createdAt).format('YYYY-MM-DD')}</span>
              <Button
                size="small"
                type="primary"
                onClick={() => download(previewDoc)}
                className="shadow-sm bg-blue-600 hover:bg-blue-700"
                icon={<DownloadOutlined />}
              >
                Download
              </Button>
            </div>
          )}
          {renderPreviewContent()}
        </div>
      </Modal>
    </div>
  );
}