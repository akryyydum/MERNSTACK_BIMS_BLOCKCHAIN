import React, { useState } from "react";
import { Form, Input, Button, message, Divider, Alert } from "antd";
import { LockOutlined, UserOutlined, InfoCircleOutlined, SafetyOutlined, BellOutlined } from "@ant-design/icons";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:4000";
  const token = localStorage.getItem("token");

  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      console.log("API_BASE:", API_BASE);
      console.log("Full URL:", `${API_BASE}/api/auth/change-password`);
      console.log("Token:", token ? "Present" : "Missing");
      
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);

      if (!res.ok) {
        throw new Error(data.message || "Failed to change password");
      }

      message.success({
        content: "Password updated successfully! Your new password is now active.",
        duration: 5,
      });
      setSuccessMessage(true);
      form.resetFields();
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(false), 5000);
    } catch (err) {
      console.error("Error details:", err);
      message.error(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  // Get user info from localStorage (matching other admin pages)
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  return (
    <AdminLayout title="Admin">
      <div className="space-y-4 px-2 md:px-1 bg-gray-50 rounded-2xl outline outline-offset-1 outline-slate-300">
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">
                Settings
              </span>
            </div>
            <div className="flex items-center outline outline-1 rounded-2xl p-5 gap-3 bg-white">
              <UserOutlined className="text-2xl text-blue-600" />
              <div className="flex flex-col items-start">
                <span className="font-semibold text-gray-700">{userProfile.fullName || "Administrator"}</span>
                <span className="text-xs text-gray-500">{username}</span>
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="px-5 pb-8">
          <div className="w-full space-y-6">
            
            {/* Row 1: Account Information and Change Password */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Account Information Card */}
              <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-black flex items-center gap-2">
                    <UserOutlined />
                    <span>Account Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Full Name</p>
                        <p className="text-sm text-gray-500 mt-1">{userProfile.fullName || "Administrator"}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Username</p>
                        <p className="text-sm text-gray-500 mt-1">{username}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Role</p>
                        <p className="text-sm text-gray-500 mt-1 capitalize">{userProfile.role || "Admin"}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <div>
                        <p className="font-medium text-gray-900">Email</p>
                        <p className="text-sm text-gray-500 mt-1">{userProfile.contact?.email || "Not set"}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Change Password Card */}
              <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-black flex items-center gap-2">
                    <LockOutlined />
                    <span>Change Password</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {successMessage && (
                    <Alert
                      message="Password Updated Successfully!"
                      description="Your new password is now active. You can use it the next time you log in."
                      type="success"
                      showIcon
                      closable
                      onClose={() => setSuccessMessage(false)}
                      className="mb-4"
                    />
                  )}
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleChangePassword}
                    autoComplete="off"
                  >
                    <Form.Item
                      label="Current Password"
                      name="currentPassword"
                      rules={[
                        {
                          required: true,
                          message: "Please enter your current password",
                        },
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined className="text-gray-400" />}
                        placeholder="Enter current password"
                        size="large"
                      />
                    </Form.Item>

                    <Form.Item
                      label="New Password"
                      name="newPassword"
                      rules={[
                        {
                          required: true,
                          message: "Please enter your new password",
                        },
                        {
                          min: 6,
                          message: "Password must be at least 6 characters",
                        },
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined className="text-gray-400" />}
                        placeholder="Enter new password"
                        size="large"
                      />
                    </Form.Item>

                    <Form.Item
                      label="Confirm New Password"
                      name="confirmPassword"
                      dependencies={["newPassword"]}
                      rules={[
                        {
                          required: true,
                          message: "Please confirm your new password",
                        },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue("newPassword") === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(
                              new Error("Passwords do not match")
                            );
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined className="text-gray-400" />}
                        placeholder="Confirm new password"
                        size="large"
                      />
                    </Form.Item>

                    <Form.Item className="mb-0">
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        size="large"
                        className="w-full md:w-auto"
                      >
                        Change Password
                      </Button>
                    </Form.Item>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Row 2: System Information and Security Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Information Card */}
              <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-black flex items-center gap-2">
                    <InfoCircleOutlined />
                    <span>System Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">System Name</p>
                        <p className="text-sm text-gray-500 mt-1">Barangay Information Management System</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Version</p>
                        <p className="text-sm text-gray-500 mt-1">1.0.0</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Blockchain Network</p>
                        <p className="text-sm text-gray-500 mt-1">Hyperledger Fabric</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <div>
                        <p className="font-medium text-gray-900">Last Updated</p>
                        <p className="text-sm text-gray-500 mt-1">November 2025</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Settings Card */}
              <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-black flex items-center gap-2">
                    <SafetyOutlined />
                    <span>Security & Privacy</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-500 mt-1">Add an extra layer of security to your account</p>
                      </div>
                      <span className="text-sm text-orange-600 font-medium">Not Enabled</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Session Timeout</p>
                        <p className="text-sm text-gray-500 mt-1">Auto logout after inactivity</p>
                      </div>
                      <span className="text-sm text-gray-600 font-medium">30 minutes</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <div>
                        <p className="font-medium text-gray-900">Login Activity</p>
                        <p className="text-sm text-gray-500 mt-1">Track login history and active sessions</p>
                      </div>
                      <span className="text-sm text-green-600 font-medium">Monitored</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
