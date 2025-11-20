import React, { useState, useEffect } from "react";
import { Form, Input, Button, message, Divider, Alert, InputNumber, Spin, Popconfirm } from "antd";
import { LockOutlined, UserOutlined, InfoCircleOutlined, SafetyOutlined, BellOutlined } from "@ant-design/icons";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [feesForm] = Form.useForm();
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [updatingFees, setUpdatingFees] = useState(false);
  const [settings, setSettings] = useState(null);

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

  // Fetch current settings
  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load settings');
      setSettings(data);
      feesForm.setFieldsValue({
        garbageFeeRegularAnnual: data.garbageFeeRegularAnnual,
        garbageFeeBusinessAnnual: data.garbageFeeBusinessAnnual,
        streetlightMonthlyFee: data.streetlightMonthlyFee,
        indigencyFee: data.documentFees?.indigency,
        barangayClearanceFee: data.documentFees?.barangayClearance
      });
    } catch (e) {
      message.error(e.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdateFees = async (values) => {
    setUpdatingFees(true);
    try {
      const payload = {
        garbageFeeRegularAnnual: Number(values.garbageFeeRegularAnnual),
        garbageFeeBusinessAnnual: Number(values.garbageFeeBusinessAnnual),
        streetlightMonthlyFee: Number(values.streetlightMonthlyFee),
        documentFees: {
          indigency: Number(values.indigencyFee),
          barangayClearance: Number(values.barangayClearanceFee)
        }
      };
      const res = await fetch(`${API_BASE}/api/admin/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update fees');
      setSettings(data);
      message.success('Fees updated successfully');
    } catch (e) {
      message.error(e.message);
    } finally {
      setUpdatingFees(false);
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

            {/* Row 2: Fee Configuration and System Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fee Configuration Card */}
              <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-black flex items-center gap-2">
                    <BellOutlined />
                    <span>Fee Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {settingsLoading ? (
                    <div className="flex items-center justify-center py-8"><Spin /></div>
                  ) : (
                    <Form form={feesForm} layout="vertical" onFinish={handleUpdateFees}>
                      <Divider orientation="left">Garbage Fees (Monthly)</Divider>
                      <Form.Item label="Regular Household Monthly Fee" name="garbageFeeRegularAnnual" rules={[{ required: true, message: 'Enter regular monthly garbage fee' }]}> 
                        <InputNumber className="w-full" min={0} addonAfter="PHP" />
                      </Form.Item>
                      <Form.Item label="Business Household Monthly Fee" name="garbageFeeBusinessAnnual" rules={[{ required: true, message: 'Enter business monthly garbage fee' }]}> 
                        <InputNumber className="w-full" min={0} addonAfter="PHP" />
                      </Form.Item>
                      <Divider orientation="left">Streetlight Fee (Monthly)</Divider>
                      <Form.Item label="Streetlight Monthly Fee" name="streetlightMonthlyFee" rules={[{ required: true, message: 'Enter streetlight monthly fee' }]}> 
                        <InputNumber className="w-full" min={0} addonAfter="PHP" />
                      </Form.Item>
                      <Divider orientation="left">Document Request Fees</Divider>
                      <Form.Item label="Indigency Certificate Fee" name="indigencyFee" rules={[{ required: true, message: 'Enter indigency certificate fee' }]}> 
                        <InputNumber className="w-full" min={0} addonAfter="PHP" />
                      </Form.Item>
                      <Form.Item label="Barangay Clearance Fee" name="barangayClearanceFee" rules={[{ required: true, message: 'Enter barangay clearance fee' }]}> 
                        <InputNumber className="w-full" min={0} addonAfter="PHP" />
                      </Form.Item>
                      <Form.Item className="mb-0">
                        <Popconfirm
                          title="Confirm Fee Update"
                          description="Are you sure you want to change these fees?  Past paid months stay the same; new rates apply to current/future months."
                          okText="Yes, Update"
                          cancelText="Cancel"
                          onConfirm={() => {
                            feesForm
                              .validateFields()
                              .then(vals => handleUpdateFees(vals));
                          }}
                        >
                          <Button type="primary" htmlType="button" loading={updatingFees} className="w-full md:w-auto">Update Fees</Button>
                        </Popconfirm>
                      </Form.Item>
                    </Form>
                  )}
                </CardContent>
              </Card>
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

              
            </div>
            
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
