import React, { useEffect, useState, useRef } from "react";
import { Table, Input, Button, Tag, message, Skeleton, Modal } from "antd";
import {
  DownloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileImageOutlined,
  FileTextOutlined,
  ClusterOutlined,
} from "@ant-design/icons";
import axios from "axios";
import apiClient from "../../utils/apiClient";
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
      const res = await apiClient.get('/api/resident/public-documents');
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
    if (docxContainerRef.current) {
      docxContainerRef.current.innerHTML = "";
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    try {
      const res = await apiClient.get(
        `/api/resident/public-documents/${record._id}/preview`,
        {
          responseType: "blob"
        }
      );
      const blob = res.data;
      // Check if the blob is actually a file, not an HTML error page
      if (blob.type.startsWith("text/html")) {
        message.error("Preview not available. Please login again or check your permissions.");
        setPreviewLoading(false);
        return;
      }
      const blobUrl = URL.createObjectURL(blob);
      // On mobile devices, many browsers block inline PDF rendering.
      // If the file is a PDF and we're on mobile, open in a new tab.
      if (/^application\/pdf/i.test(record.mimeType || "") && isMobile) {
        try {
          window.open(blobUrl, "_blank", "noopener,noreferrer");
        } catch (err) {
          // If popup blocked, fall back to showing the modal with iframe
          setPreviewUrl(blobUrl);
          setPreviewBlob(blob);
          setShowPreviewModal(true);
        }
        // Since we've handed off the blob URL to a new tab, revoke later
        // but keep a small timeout to allow the tab to load.
        setTimeout(() => {
          try { URL.revokeObjectURL(blobUrl); } catch {}
        }, 10000);
        setPreviewLoading(false);
        return;
      }
      // Default inline preview path (desktop or non-PDF types)
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
      const res = await apiClient.get(
        `/api/resident/public-documents/${record._id}/download`,
        {
          responseType: "blob"
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
          onClick={(e) => {
            e.stopPropagation();
            openPreview(r);
          }}
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
            onClick={(e) => {
              e.stopPropagation();
              openPreview(r);
            }}
            className="shadow-sm"
          >
            View
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              download(r);
            }}
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
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
                <ClusterOutlined className="text-red-600 animate-spin" />
                <span>This document has been deleted according to the blockchain. Preview or download may be limited.</span>
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
      <main className="mx-auto w-full max-w-9xl space-y-4 px-3 py-4 sm:px-4 lg:px-6">
        <Card className="w-full border border-slate-200 shadow-md bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1">
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-800">
                  Public Documents
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-600">
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
                  className="w-full sm:w-64"
                />
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="w-full lg:col-span-5 border border-slate-200 shadow-md bg-white">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-slate-800">Document List</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-600">Click on any document to preview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 pt-5">
              <Table
                rowKey="_id"
                loading={loading}
                dataSource={filtered}
                columns={columns}
                pagination={{ pageSize: 10 }}
                onRow={(record) => ({
                  onClick: () => openPreview(record),
                })}
                rowClassName={() => "cursor-pointer hover:bg-slate-50 transition-colors"}
                scroll={{ x: 700 }}
              />
            </CardContent>
          </Card>
          {/* Desktop / large screen side preview */}
          <Card className="w-full lg:col-span-7 hidden md:block border border-slate-200 shadow-md bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base sm:text-lg font-semibold text-slate-800 truncate">
                    {previewDoc ? previewDoc.title : "Select a document to preview"}
                  </CardTitle>
                  {previewDoc && (
                    <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm text-slate-600 flex-wrap">
                      <Tag size="small">{previewDoc.category || "General"}</Tag>
                      {previewDoc.status && (
                        <Tag size="small" color={STATUS_COLORS[previewDoc.status] || 'default'} className="uppercase">
                          {previewDoc.status === 'not_registered' ? 'UNREGISTERED' : previewDoc.status.toUpperCase()}
                        </Tag>
                      )}
                      <span className="text-xs">
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
            <CardContent className="pt-5">
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
        style={{ maxWidth: '800px', top: 20 }}
        title={<span className="text-base sm:text-lg font-semibold">{previewDoc ? previewDoc.title : 'Document Preview'}</span>}
        destroyOnClose
        className="mobile-modal"
      >
        <div className="space-y-3 sm:space-y-4">
          {previewDoc && (
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600 bg-slate-50 p-2 sm:p-3 rounded-lg border border-slate-100">
              <Tag size="small">{previewDoc.category || 'General'}</Tag>
              {previewDoc.status && (
                <Tag size="small" color={STATUS_COLORS[previewDoc.status] || 'default'} className="uppercase">
                  {previewDoc.status === 'not_registered' ? 'UNREGISTERED' : previewDoc.status.toUpperCase()}
                </Tag>
              )}
              <span className="text-xs">Uploaded {dayjs(previewDoc.createdAt).format('YYYY-MM-DD')}</span>
              <Button
                size="small"
                type="primary"
                onClick={() => download(previewDoc)}
                className="shadow-sm bg-blue-600 hover:bg-blue-700 ml-auto"
                icon={<DownloadOutlined />}
              >
                Download
              </Button>
            </div>
          )}
          <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            {renderPreviewContent()}
          </div>
        </div>
      </Modal>
    </div>
  );
}