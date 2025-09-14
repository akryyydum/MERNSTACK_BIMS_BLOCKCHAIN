import React, { useEffect, useState } from "react";
import { Card, Typography, Button, message, Table, Tabs, Tag } from "antd";
import { Card as ShadcnCard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarOutlined, 
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import axios from "axios";

import ResidentNavbar from "./ResidentNavbar";

const { Title } = Typography;
const { TabPane } = Tabs;

export default function ResidentPayment() {
  const [loading, setLoading] = useState(false);
  const [resident, setResident] = useState(null);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => {
    // Get resident info from localStorage
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    setResident(userProfile);
    
    // For this implementation, we'll use mock data
    // In a real app, you'd fetch payments from an API
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

  // Calculate total amounts
  const totalDue = payments
    .filter(p => p.status === "pending" || p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);
    
  const overdueAmount = payments
    .filter(p => p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);
    
  const paidAmount = payments
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  // Filter payments based on active tab
  const filteredPayments = payments.filter(payment => {
    if (activeTab === "all") return true;
    return payment.status === activeTab;
  });

  // Function to render status tags
  const renderStatus = (status) => {
    switch (status) {
      case "paid":
        return <Tag color="green"><CheckCircleOutlined /> Paid</Tag>;
      case "pending":
        return <Tag color="blue"><ClockCircleOutlined /> Pending</Tag>;
      case "overdue":
        return <Tag color="red"><ExclamationCircleOutlined /> Overdue</Tag>;
      case "upcoming":
        return <Tag color="default"><CalendarOutlined /> Upcoming</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // Table columns
  const columns = [
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "Period",
      dataIndex: "period",
      key: "period",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => `₱${amount.toFixed(2)}`,
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: renderStatus,
    },
  // Removed Actions column (Pay Now button) as per new requirements
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <ResidentNavbar />
      <div className="w-full p-4 sm:p-6 lg:p-8 pt-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header Section with Title and Payment Schedule */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Resident Payments</h1>
              <p className="text-gray-500 text-sm mt-1">
                Manage your quarterly barangay fees and payments
              </p>
            </div>
            <div className="flex items-center gap-3 bg-blue-50 rounded-md p-4 shadow-sm border border-blue-100">
              <DollarOutlined className="text-blue-600" />
              <div>
                <p className="text-xs text-blue-700">Payment Schedule</p>
                <p className="font-medium text-blue-900">Quarterly (Every 3 Months)</p>
              </div>
            </div>
          </div>
          {/* Payment Statistics Cards */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Payment Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
              <p className="text-sm text-amber-700">Current Balance Due</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">₱{totalDue.toFixed(2)}</p>
              <p className="text-xs text-amber-600 mt-1">Includes pending and overdue payments</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
              <p className="text-sm text-red-700">Overdue Amount</p>
              <p className="text-2xl font-bold text-red-900 mt-1">₱{overdueAmount.toFixed(2)}</p>
              <p className="text-xs text-red-600 mt-1">Past due payments requiring immediate attention</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <p className="text-sm text-green-700">Total Paid (This Year)</p>
              <p className="text-2xl font-bold text-green-900 mt-1">₱{paidAmount.toFixed(2)}</p>
              <p className="text-xs text-green-600 mt-1">All payments successfully completed</p>
            </div>
          </div>
          
          {/* Fee Information */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8 border border-blue-100">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Barangay Fee Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-md p-4 border border-gray-100 shadow-sm">
                <h4 className="font-semibold text-blue-800 mb-2">Garbage Collection Fee</h4>
                <p className="text-gray-600 mb-2">A quarterly fee for barangay waste management services.</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-gray-500">Quarterly Rate:</span>
                  <span className="font-bold text-gray-800">₱50.00</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-500">Annual Total:</span>
                  <span className="font-bold text-gray-800">₱200.00</span>
                </div>
              </div>
              <div className="bg-white rounded-md p-4 border border-gray-100 shadow-sm">
                <h4 className="font-semibold text-blue-800 mb-2">Streetlight Maintenance Fee</h4>
                <p className="text-gray-600 mb-2">A quarterly fee for maintaining community street lighting.</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-gray-500">Quarterly Rate:</span>
                  <span className="font-bold text-gray-800">₱150.00</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-500">Annual Total:</span>
                  <span className="font-bold text-gray-800">₱600.00</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              <strong>Note:</strong> All barangay fees are collected on a quarterly basis and are due by the last day of each quarter. Late payments may incur additional fees.
            </p>
          </div>
          
          {/* Payment History Table */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Payment History</h2>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            className="mb-6"
            type="card"
            items={[
              {
                key: 'all',
                label: 'All Payments',
                children: null,
              },
              {
                key: 'pending',
                label: 'Pending',
                children: null,
              },
              {
                key: 'overdue',
                label: 'Overdue',
                children: null,
              },
              {
                key: 'paid',
                label: 'Paid',
                children: null,
              },
              {
                key: 'upcoming',
                label: 'Upcoming',
                children: null,
              },
            ]}
          />
          
          <div className="border rounded-lg overflow-x-auto shadow-sm">
            <table className="min-w-full bg-white table-auto">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        <span className="text-gray-500">Loading payments...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <DollarOutlined style={{ fontSize: '32px' }} className="text-gray-400 mb-2" />
                        <p className="text-gray-500 font-medium">No payment records found</p>
                        <p className="text-gray-400 text-sm mt-1">You have no payment records for this year</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <DollarOutlined className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{payment.description}</p>
                            <p className="text-xs text-gray-500">ID: {payment.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700">{payment.type}</td>
                      <td className="py-4 px-6 text-sm text-gray-700">{payment.period}</td>
                      <td className="py-4 px-6 text-sm text-gray-700">₱{payment.amount.toFixed(2)}</td>
                      <td className="py-4 px-6 text-sm text-gray-700">{new Date(payment.dueDate).toLocaleDateString()}</td>
                      <td className="py-4 px-6">
                        {renderStatus(payment.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
