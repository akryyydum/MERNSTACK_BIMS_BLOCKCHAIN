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
  CalendarOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import axios from "axios";

const { Title } = Typography;

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [resident, setResident] = useState(null);
  const [payments, setPayments] = useState([]);

  const userProfile = JSON.parse(localStorage.getItem("userProfile")) || {};
  const username = userProfile.username || localStorage.getItem("username") || "Resident";

  useEffect(() => {
    // Fetch requests and resident info on component mount
    fetchRequests();
    // Get resident info from localStorage
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    setResident(userProfile);
    // Generate mock payment data
    generateMockPayments();
  }, []);
  
  // Generate mock payment data based on current date
  const generateMockPayments = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Calculate which quarter we're in (0-based)
    const currentQuarter = Math.floor(currentMonth / 3);
    
    // Create payment records for the year
    const mockPayments = [];
    
    // Create 4 quarters of payment records
    for (let quarter = 0; quarter < 4; quarter++) {
      // Calculate due date (last day of the quarter)
      const dueDate = new Date(currentYear, (quarter + 1) * 3, 0);
      
      // Determine payment status based on current date and quarter
      let status = "pending";
      if (quarter < currentQuarter) {
        // Past quarters are either paid or overdue
        status = Math.random() > 0.3 ? "paid" : "overdue";
      } else if (quarter === currentQuarter) {
        // Current quarter is pending
        status = "pending";
      } else {
        // Future quarters are upcoming
        status = "upcoming";
      }
      
      // Add garbage fee payment record
      mockPayments.push({
        id: `garbage-${currentYear}-q${quarter + 1}`,
        description: `Garbage Fee - Q${quarter + 1} ${currentYear}`,
        amount: 50,
        dueDate: dueDate.toISOString(),
        paymentDate: status === "paid" ? new Date(dueDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        status,
        type: "Garbage Fee",
        period: `Q${quarter + 1} ${currentYear}`
      });
      
      // Add streetlight fee payment record
      mockPayments.push({
        id: `streetlight-${currentYear}-q${quarter + 1}`,
        description: `Streetlight Fee - Q${quarter + 1} ${currentYear}`,
        amount: 150,
        dueDate: dueDate.toISOString(),
        paymentDate: status === "paid" ? new Date(dueDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        status,
        type: "Streetlight Fee",
        period: `Q${quarter + 1} ${currentYear}`
      });
    }
    
    setPayments(mockPayments);
  };

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
  const pendingPayments = requests.filter(r => r.status === "accepted" && !r.paymentStatus).length;
  
  // Payment statistics
  const totalDue = payments
    .filter(p => p.status === "pending" || p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);
    
  const paidAmount = payments
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
    
  const pendingFees = payments
    .filter(p => p.status === "pending")
    .length;

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
              </div>
            </div>
          </div>
          
          {/* Dashboard Statistics - Side by side layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Request Statistics Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FileTextOutlined className="mr-2" /> Your Document Requests
                <Button 
                  type="link" 
                  size="small" 
                  className="ml-2 text-blue-600" 
                  onClick={() => navigate('/resident/requests')}
                >
                  Make New Request
                </Button>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 hover:shadow-md transition-shadow flex flex-col justify-between min-h-[200px] h-48">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700">All Requests</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">{totalRequests}</p>
                      <p className="text-xs text-blue-600 mt-1">Document requests made</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <FileTextOutlined className="text-blue-600" style={{ fontSize: '24px' }} />
                    </div>
                  </div>

                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-100 hover:shadow-md transition-shadow flex flex-col justify-between min-h-[200px] h-48">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700">New Request</p>
                      <p className="text-2xl font-bold text-green-900 mt-1">Request Document</p>
                      <p className="text-xs text-green-600 mt-1">Apply for barangay documents</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <FileTextOutlined className="text-green-600" style={{ fontSize: '24px' }} />
                    </div>
                  </div>
                  <div className="mt-auto pt-3">
                    <Button 
                      type="primary" 
                      size="small" 
                      className="bg-green-500 hover:bg-green-600 border-green-600"
                      onClick={() => navigate('/resident/requests')}
                    >
                      Request Document
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Payment Summary Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <DollarOutlined className="mr-2" /> Barangay Fee Summary
                <Button 
                  type="link" 
                  size="small" 
                  className="ml-2 text-blue-600" 
                  onClick={() => navigate('/resident/payments')}
                >
                  View All Payments
                </Button>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 hover:shadow-md transition-shadow flex flex-col justify-between min-h-[200px] h-48">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-amber-700">Current Balance Due</p>
                      <p className="text-2xl font-bold text-amber-900 mt-1">₱{totalDue.toFixed(2)}</p>
                      <p className="text-xs text-amber-600 mt-1">Garbage & Streetlight fees</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <DollarOutlined className="text-amber-600" style={{ fontSize: '24px' }} />
                    </div>
                  </div>
                  <div className="mt-auto pt-3">
                    <Button 
                      type="primary" 
                      size="small" 
                      className="bg-amber-500 hover:bg-amber-600 border-amber-600"
                      onClick={() => navigate('/resident/payments')}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 hover:shadow-md transition-shadow flex flex-col justify-between min-h-[200px] h-48">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700">Payment Schedule</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">Quarterly</p>
                      <p className="text-xs text-blue-600 mt-1">Every 3 Months</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <CalendarOutlined className="text-blue-600" style={{ fontSize: '24px' }} />
                    </div>
                  </div>
                  <div className="mt-auto pt-3">
                    <p className="text-xs text-gray-600">
                      <strong>Garbage Fee:</strong> ₱50/quarter
                    </p>
                    <p className="text-xs text-gray-600">
                      <strong>Streetlight Fee:</strong> ₱150/quarter
                    </p>
                  </div>
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
                {requests.slice(0, 3).map((request) => (
                  <div key={request._id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-100">
                    <div className="flex items-center mb-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <FileTextOutlined className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{request.documentType}</p>
                      </div>
                      <div className="ml-2">
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
                    <div className="mt-4">
                      <span className="text-xs text-gray-500">Status: </span>
                      <span className={`text-xs font-medium ${request.status === "accepted" ? "text-green-600" : request.status === "declined" ? "text-red-600" : "text-gray-800"}`}>
                        {request.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
