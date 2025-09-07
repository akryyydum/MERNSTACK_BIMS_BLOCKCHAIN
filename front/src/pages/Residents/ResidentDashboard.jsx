import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ResidentNavbar from "./ResidentNavbar";
import { Card, Typography, Button, message } from "antd";
import { 
  FileTextOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  CreditCardOutlined, 
  DollarOutlined,
  UserOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import axios from "axios";

const { Title } = Typography;

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [resident, setResident] = useState(null);

  const userProfile = JSON.parse(localStorage.getItem("userProfile")) || {};
  const username = userProfile.username || localStorage.getItem("username") || "Resident";

  useEffect(() => {
    // Fetch requests and resident info on component mount
    fetchRequests();
    // Get resident info from localStorage
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    setResident(userProfile);
  }, []);

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
      setRequests([]);
    }
    setLoading(false);
  };

  // Request statistics
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === "PENDING").length;
  const approvedRequests = requests.filter(r => r.status === "APPROVED").length;
  const rejectedRequests = requests.filter(r => r.status === "REJECTED").length;
  const pendingPayments = requests.filter(r => r.status === "APPROVED" && !r.paymentStatus).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <ResidentNavbar />
      <div className="w-full p-4 sm:p-6 lg:p-8 pt-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header Section with Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Resident Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">
                Welcome back, {username}! Track your document requests and barangay services
              </p>
            </div>
          </div>
          
          {/* User Profile Summary */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8 border border-blue-100">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-blue-200 flex items-center justify-center">
                  <UserOutlined style={{ fontSize: '24px' }} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-blue-900">{resident?.firstName} {resident?.lastName}</h2>
                  <p className="text-blue-700">Resident ID: {resident?._id?.substring(0, 8) || "Not available"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="bg-white rounded-md p-4 flex items-center gap-3 shadow-sm">
                  <CalendarOutlined className="text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500">Resident Since</p>
                    <p className="font-medium text-gray-800">{new Date(resident?.createdAt).toLocaleDateString() || "N/A"}</p>
                  </div>
                </div>
                <div className="bg-white rounded-md p-4 flex items-center gap-3 shadow-sm">
                  <FileTextOutlined className="text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500">Total Requests</p>
                    <p className="font-medium text-gray-800">{totalRequests}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Request Statistics Cards */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Document Requests</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">All Requests</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{totalRequests}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileTextOutlined className="text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700">Pending</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">{pendingRequests}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <ClockCircleOutlined className="text-amber-600" />
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Approved</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{approvedRequests}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircleOutlined className="text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700">Rejected</p>
                  <p className="text-2xl font-bold text-red-900 mt-1">{rejectedRequests}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <ClockCircleOutlined className="text-red-600" />
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700">Pending Payments</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">{pendingPayments}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <CreditCardOutlined className="text-purple-600" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Activity Section - Card Grid Layout */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
          {loading ? (
            <div className="text-center py-8 bg-white rounded-lg shadow-sm">
              <div className="flex justify-center items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                <span className="text-gray-500">Loading activity...</span>
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <div className="flex flex-col items-center">
                <FileTextOutlined style={{ fontSize: '32px' }} className="text-gray-400 mb-2" />
                <p className="text-gray-500 font-medium">No document requests found</p>
                <p className="text-gray-400 text-sm mt-1">Click "Request Document" to create your first document request</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {requests.slice(0, 6).map((request) => (
                  <div key={request._id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-100">
                    <div className="flex items-center mb-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <FileTextOutlined className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{request.documentType}</p>
                      </div>
                      <div className="ml-2">
                        {request.status === "PENDING" && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                            PENDING
                          </span>
                        )}
                        {request.status === "APPROVED" && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            APPROVED
                          </span>
                        )}
                        {request.status === "REJECTED" && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            REJECTED
                          </span>
                        )}
                        {request.status === "RELEASED" && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            RELEASED
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="pl-13 ml-13">
                      <p className="text-sm text-gray-500 mb-2">
                        <strong>Purpose:</strong> {request.purpose && request.purpose.length > 30 
                          ? `${request.purpose.substring(0, 30)}...` 
                          : request.purpose || 'Not specified'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Requested on {new Date(request.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {requests.length > 6 && (
                <div className="mt-4 text-center">
                  <Button 
                    type="default"
                    onClick={() => navigate('/resident/request')}
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    View all {requests.length} requests
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
