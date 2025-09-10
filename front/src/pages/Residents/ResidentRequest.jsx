import React, { useEffect, useState } from "react";
import { Table, Input, Button, Modal, Descriptions, Tag, Select, message, Form, Tabs } from "antd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { 
  UserOutlined, 
  FileTextOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileOutlined,
  DownloadOutlined
} from "@ant-design/icons";
import axios from "axios";

import ResidentNavbar from './ResidentNavbar';

export default function ResidentRequest() {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resident, setResident] = useState(null);

  const [createForm] = Form.useForm();


  useEffect(() => {
    // Only fetch requests on initial load
    fetchRequests();
    // We'll get the resident info from localStorage instead of API
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    setResident(userProfile);
  }, []);

  // (Removed unused fetchUserInfo function)

  // Fetch document requests for the current resident
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        message.error("You are not logged in. Please log in first.");
        setLoading(false);
        return;
      }

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/document-requests`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRequests(res.data);
      
      // If we have requests with resident information, update the resident state
      if (res.data && res.data.length > 0 && res.data[0].residentId) {
        setResident(res.data[0].residentId);
      }
    } catch (error) {
      console.error("Error fetching document requests:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        message.error("Authentication error. Please log in again.");
      } else {
        message.error("Failed to load document requests.");
      }
      // Set empty array instead of undefined
      setRequests([]);
    }
    setLoading(false);
  };

  // Request statistics
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === "pending").length;
  const approvedRequests = requests.filter(r => r.status === "accepted").length;
  const rejectedRequests = requests.filter(r => r.status === "declined").length;

  const filteredRequests = requests.filter(r => {
    // Handle the tab filtering
    if (search === "pending") {
      return r.status === "pending";
    } else if (search === "approved") {
      return r.status === "accepted";
    } else if (search === "rejected") {
      return r.status === "declined";
    }
    
    // Default: show all requests
    return true;
  });

  const openView = (request) => {
    setViewRequest(request);
    setViewOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ResidentNavbar />
      <div className="w-full p-4 sm:p-6 lg:p-8 pt-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header Section with Title and Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">My Document Requests</h1>
              <p className="text-gray-500 text-sm mt-1">
                Submit and track your official barangay documents
              </p>
            </div>
            <Button 
              type="primary" 
              size="large" 
              onClick={() => setCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1"
              icon={<FileTextOutlined />}
            >
              New Request
            </Button>
          </div>
          
          {/* Request Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-blue-700">All Requests</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{totalRequests}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
              <p className="text-sm text-amber-700">Pending</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{pendingRequests}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <p className="text-sm text-green-700">Approved</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{approvedRequests}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
              <p className="text-sm text-red-700">Rejected</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{rejectedRequests}</p>
            </div>
          </div>
          
          {/* Filter Tabs */}
          <Tabs 
            defaultActiveKey="all"
            className="mb-6"
            type="card"
            items={[
              {
                key: 'all',
                label: 'All Requests',
                children: null,
              },
              {
                key: 'pending',
                label: 'Pending',
                children: null,
              },
              {
                key: 'approved',
                label: 'Approved',
                children: null,
              },
              {
                key: 'rejected',
                label: 'Rejected',
                children: null,
              },
            ]}
            onChange={(key) => {
              if (key === 'all') {
                setSearch("");
              } else if (key === 'pending') {
                setSearch("pending");
              } else if (key === 'approved') {
                setSearch("approved");
              } else if (key === 'rejected') {
                setSearch("rejected");
              }
            }}
          />
          
          <div className="border rounded-lg overflow-x-auto shadow-sm">
            <table className="min-w-full bg-white table-auto">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Purpose</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        <span className="text-gray-500">Loading requests...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <FileTextOutlined style={{ fontSize: '32px' }} className="text-gray-400 mb-2" />
                        <p className="text-gray-500 font-medium">No document requests found</p>
                        <p className="text-gray-400 text-sm mt-1">Click "New Request" to create a document request</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request._id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <FileTextOutlined className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{request.documentType}</p>
                            <p className="text-xs text-gray-500">ID: {request._id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700 hidden sm:table-cell">
                        <div className="max-w-xs truncate">{request.purpose}</div>
                      </td>
                      <td className="py-4 px-6 hidden md:table-cell">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{new Date(request.requestedAt).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-500">{new Date(request.requestedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 hidden sm:table-cell">
                        {request.status === "pending" && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                            PENDING
                          </span>
                        )}
                        {request.status === "accepted" && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            APPROVED
                          </span>
                        )}
                        {request.status === "declined" && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            REJECTED
                          </span>
                        )}
                        {request.status === "completed" && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            RELEASED
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <Button
                          type="default"
                          size="small"
                          onClick={() => openView(request)}
                          className="border border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          Track
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Request Modal */}
      <Modal
        title={null}
        open={viewOpen}
        onCancel={() => setViewOpen(false)}
        footer={null}
        width={"90%"}
        style={{ maxWidth: "800px" }}
        className="document-tracking-modal"
        bodyStyle={{ padding: 0 }}
      >
        {viewRequest && (
          <div>
            {/* Header Section */}
            <div className="bg-gray-50 p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{viewRequest.documentType}</h3>
                  <p className="text-gray-500 mt-1">Request ID: {viewRequest._id}</p>
                </div>
                
                {/* Status Badge */}
                <div>
                  {viewRequest.status === "pending" && (
                    <div className="px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
                      PENDING
                    </div>
                  )}
                  {viewRequest.status === "accepted" && (
                    <div className="px-4 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                      APPROVED
                    </div>
                  )}
                  {viewRequest.status === "declined" && (
                    <div className="px-4 py-1.5 rounded-full bg-red-100 text-red-800 text-sm font-medium">
                      REJECTED
                    </div>
                  )}
                  {viewRequest.status === "completed" && (
                    <div className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                      RELEASED
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Document Details */}
            <div className="p-6">
              <h4 className="text-lg font-medium text-gray-800 mb-3">Request Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">PURPOSE</p>
                  <p className="mt-1">{viewRequest.purpose}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">DOCUMENT TYPE</p>
                  <p className="mt-1">{viewRequest.documentType}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">REQUESTED DATE</p>
                  <p className="mt-1">{viewRequest.requestedAt ? new Date(viewRequest.requestedAt).toLocaleString() : "-"}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">LAST UPDATED</p>
                  <p className="mt-1">{viewRequest.updatedAt ? new Date(viewRequest.updatedAt).toLocaleString() : "-"}</p>
                </div>
              </div>
              
              {/* Status Timeline */}
              <div className="mb-8">
                <h4 className="text-lg font-medium text-gray-800 mb-4">Request Timeline</h4>
                
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-3.5 top-0 h-full w-0.5 bg-gray-200"></div>
                  
                  {/* Timeline Steps */}
                  <div className="space-y-6 relative">
                    {/* Requested Step (Always shown) */}
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center z-10">
                        <CheckCircleOutlined className="text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-800">Requested</p>
                        <p className="text-xs text-gray-500">{viewRequest.requestedAt ? new Date(viewRequest.requestedAt).toLocaleString() : "-"}</p>
                      </div>
                    </div>
                    
                    {/* Processing Step (Always shown but styled differently based on status) */}
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center z-10 
                        ${viewRequest.status === "pending" ? "bg-amber-500" : "bg-blue-500"}`}>
                        <ClockCircleOutlined className="text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-800">Processing</p>
                        <p className="text-xs text-gray-500">
                          {viewRequest.status === "pending" 
                            ? "Your request is being processed" 
                            : "Your request has been processed"}
                        </p>
                      </div>
                    </div>
                    
                    {/* Approved/Rejected Step (Shown when not pending) */}
                    {viewRequest.status !== "pending" && (
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center z-10
                          ${viewRequest.status === "accepted" || viewRequest.status === "completed" ? "bg-green-500" : "bg-red-500"}`}>
                          {viewRequest.status === "accepted" || viewRequest.status === "completed" ? (
                            <CheckCircleOutlined className="text-white" />
                          ) : (
                            <CloseCircleOutlined className="text-white" />
                          )}
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-800">
                            {viewRequest.status === "accepted" || viewRequest.status === "completed" ? "Approved" : "Rejected"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {viewRequest.updatedAt ? new Date(viewRequest.updatedAt).toLocaleString() : "-"}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Released Step (Shown only for released docs) */}
                    {viewRequest.status === "completed" && (
                      <div className="flex items-start">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center z-10">
                          <CheckCircleOutlined className="text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-800">Released</p>
                          <p className="text-xs text-gray-500">Your document has been released</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Blockchain Information (if available) */}
              {viewRequest.blockchain?.hash && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">Blockchain Verification</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">HASH</p>
                      <p className="mt-1 font-mono text-sm break-all">{viewRequest.blockchain.hash || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">TRANSACTION ID</p>
                      <p className="mt-1 font-mono text-sm break-all">{viewRequest.blockchain.lastTxId || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">ISSUED BY</p>
                      <p className="mt-1">{viewRequest.blockchain.issuedBy || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">ISSUED DATE</p>
                      <p className="mt-1">{viewRequest.blockchain.issuedAt ? new Date(viewRequest.blockchain.issuedAt).toLocaleString() : "-"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer with close button */}
            <div className="bg-gray-50 p-4 flex justify-end border-t">
              <Button onClick={() => setViewOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Request Modal */}
      <Modal
        title={null}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        width={"90%"}
        style={{ maxWidth: "600px" }}
        bodyStyle={{ padding: 0 }}
      >
        <div className="bg-gray-50 p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-800">Request New Document</h3>
          <p className="text-gray-500 text-sm mt-1">
            Fill out the form below to request an official document
          </p>
        </div>
        
        <div className="p-6">
          <Form 
            form={createForm} 
            layout="vertical" 
            className="space-y-4"
            onFinish={async (values) => {
              try {
                setCreating(true);
                const token = localStorage.getItem("token");
                if (!token) {
                  message.error("You are not logged in. Please log in first.");
                  setCreating(false);
                  return;
                }
                // Add residentId and requestedBy to the request body
                const payload = {
                  ...values,
                  residentId: resident?._id,
                  requestedBy: resident?._id
                };
                await axios.post(
                  `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/document-requests`,
                  payload,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                message.success("Document request submitted successfully!");
                setCreateOpen(false);
                createForm.resetFields();
                fetchRequests();
              } catch (err) {
                console.error("Error creating request:", err);
                if (err.response?.status === 401 || err.response?.status === 403) {
                  message.error("Authentication error. Please log in again.");
                } else {
                  message.error(err?.response?.data?.message || "Failed to create document request");
                }
              }
              setCreating(false);
            }}
          >
            <Form.Item 
              name="documentType" 
              label={<span className="text-gray-700 font-medium">Document Type</span>}
              rules={[{ required: true, message: 'Please select a document type' }]}
            >
              <Select
                placeholder="Select document type"
                size="large"
                className="w-full"
                options={[
                  { value: "Barangay Certificate", label: "Barangay Certificate" },
                  { value: "Indigency", label: "Certificate of Indigency" },
                  { value: "Barangay Clearance", label: "Barangay Clearance" },
                  { value: "Residency", label: "Certificate of Residency" },
                  { value: "Business Clearance", label: "Business Clearance" },
                ]}
              />
            </Form.Item>
            
            <Form.Item 
              name="purpose" 
              label={<span className="text-gray-700 font-medium">Purpose</span>}
              rules={[{ required: true, message: 'Please specify the purpose for your request' }]}
              help="Clearly state why you need this document"
            >
              <Input.TextArea 
                rows={4} 
                placeholder="Example: For employment requirements, school enrollment, business registration, etc."
                className="w-full"
              />
            </Form.Item>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
              <h4 className="text-blue-800 font-medium text-sm mb-1">Important Information</h4>
              <p className="text-blue-700 text-xs">
                Your document request will be reviewed by barangay officials. Processing time may vary depending on the type of document and current volume of requests.
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={creating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Submit Request
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
}
