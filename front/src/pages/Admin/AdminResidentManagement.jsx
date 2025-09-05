import React, { useEffect, useState } from "react";
import { Table, Input, Button, Modal, Form, Select, DatePicker, Popconfirm, message, Switch, Descriptions } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { UserOutlined } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";

export default function AdminResidentManagement() {
  const [loading, setLoading] = useState(false);
  const [residents, setResidents] = useState([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewResident, setViewResident] = useState(null);

  // Get user info from localStorage (or context/auth if you have it)
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta?.env?.VITE_API_URL || "http://localhost:4000"}/api/admin/residents`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setResidents(res.data);
    } catch (err) {
      // handle error
    }
    setLoading(false);
  };

  // Add Resident
  const handleAddResident = async () => {
    try {
      setCreating(true);
      const values = await addForm.validateFields();
      const token = localStorage.getItem("token");
      await axios.post(
        `${import.meta?.env?.VITE_API_URL || "http://localhost:4000/api/admin/residents"}`,
        {
          ...values,
          dateOfBirth: values.dateOfBirth.format("YYYY-MM-DD"),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success("Resident added!");
      setAddOpen(false);
      addForm.resetFields();
      fetchResidents();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to add resident");
    }
    setCreating(false);
  };

  // Edit Resident
  const openEdit = (resident) => {
    setSelectedResident(resident);
    editForm.setFieldsValue({
      ...resident,
      dateOfBirth: resident.dateOfBirth ? dayjs(resident.dateOfBirth) : null,
    });
    setEditOpen(true);
  };

  const handleEditResident = async () => {
    try {
      setEditing(true);
      const values = await editForm.validateFields();
      const token = localStorage.getItem("token");
      await axios.patch(
        `${import.meta?.env?.VITE_API_URL || "http://localhost:4000/api/admin/residents"}/${selectedResident._id}`,
        {
          ...values,
          dateOfBirth: values.dateOfBirth.format("YYYY-MM-DD"),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success("Resident updated!");
      setEditOpen(false);
      fetchResidents();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update resident");
    }
    setEditing(false);
  };

  // Delete Resident
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${import.meta?.env?.VITE_API_URL || "http://localhost:4000/api/admin/residents"}/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success("Resident deleted!");
      fetchResidents();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete resident");
    }
  };

  // Verify Resident
  const handleToggleVerify = async (id, next) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${import.meta?.env?.VITE_API_URL || "http://localhost:4000/api/admin/residents"}/${id}/verify`,
        { status: next ? "verified" : "unverified" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success(next ? "Resident verified!" : "Resident unverified!");
      fetchResidents();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update verification");
    }
  };

  // Statistics
  const totalResidents = residents.length;
  const maleResidents = residents.filter(r => r.gender === "male").length;
  const femaleResidents = residents.filter(r => r.gender === "female").length;
  const activeResidents = residents.filter(r => r.status === "verified").length;
  const inactiveResidents = residents.filter(r => r.status !== "verified").length;

  const columns = [
    {
      title: "Full Name",
      key: "fullName",
      render: (_, r) =>
        [r.firstName, r.middleName, r.lastName, r.suffix]
          .filter(Boolean)
          .join(" "),
    },
    { title: "Gender", dataIndex: "gender", key: "gender" },
    { title: "Date of Birth", dataIndex: "dateOfBirth", key: "dateOfBirth", render: v => v ? new Date(v).toLocaleDateString() : "" },
    { title: "Civil Status", dataIndex: "civilStatus", key: "civilStatus" },
    { title: "Mobile", dataIndex: ["contact", "mobile"], key: "mobile", render: (_, r) => r.contact?.mobile },
    { title: "Email", dataIndex: ["contact", "email"], key: "email", render: (_, r) => r.contact?.email },
    { title: "Address", key: "address", render: (_, r) =>
        `${r.address?.street || ""}, ${r.address?.barangay || ""}, ${r.address?.municipality || ""}, ${r.address?.province || ""}` },
    { title: "Citizenship", dataIndex: "citizenship", key: "citizenship" },
    { title: "Occupation", dataIndex: "occupation", key: "occupation" },
    { title: "Education", dataIndex: "education", key: "education" },
   
    {
      title: "Blockchain Hash",
      dataIndex: ["blockchain", "hash"],
      key: "blockchainHash",
      render: (_, r) => r.blockchain?.hash || "-",
    },
     {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v, r) => (
        <Switch
          checked={v === "verified"}
          onChange={next => handleToggleVerify(r._id, next)}
          checkedChildren={null}
          unCheckedChildren={null}
          className="bg-transparent"
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => openView(r)}>View</Button>
          <Button size="small" onClick={() => openEdit(r)}>Edit</Button>
          <Popconfirm
            title="Delete resident?"
            description="This action cannot be undone."
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(r._id)}
          >
            <Button danger size="small">Delete</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const filteredResidents = residents.filter(r =>
    [
      r.firstName,
      r.middleName,
      r.lastName,
      r.suffix,
      r.contact?.email,
      r.contact?.mobile,
      r.address?.street,
      r.address?.barangay,
      r.address?.municipality,
      r.address?.province,
      r.citizenship,
      r.occupation,
      r.education,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const openView = (resident) => {
    setViewResident(resident);
    setViewOpen(true);
  };

  return (
    <AdminLayout title="Admin">
      <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">
                Residents Management
              </span>
            </div>
            <div className="flex items-center outline outline-1 rounded-2xl p-5 gap-3">
              <UserOutlined className="text-2xl text-blue-600" />
              <div className="flex flex-col items-start">
                <span className="font-semibold text-gray-700">{userProfile.fullName || "Administrator"}</span>
                <span className="text-xs text-gray-500">{username}</span>
              </div>
            </div>
          </nav>
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Total Residents
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {totalResidents}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {totalResidents}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Male Residents
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {maleResidents}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {maleResidents}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Female Residents
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {femaleResidents}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {femaleResidents}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black shadow-md py-10 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Verified Residents
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {activeResidents}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {activeResidents}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-10 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Unverified Residents
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {inactiveResidents}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {inactiveResidents}
                  </div>
                </CardContent>
              </Card>
              {/* Add more cards as needed */}
            </div>
          </div>
        </div>
        {/* Table Section */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <hr className="border-t border-gray-300" />
          <div className="flex flex-col md:flex-row flex-wrap gap-2 md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <Input.Search
                allowClear
                placeholder="Search residents"
                onSearch={v => setSearch(v.trim())}
                value={search}
                onChange={e => setSearch(e.target.value)}
                enterButton
                className="min-w-[180px] max-w-xs"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="primary" onClick={() => setAddOpen(true)}>
                Add Resident
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table
              rowKey="_id"
              loading={loading}
              dataSource={filteredResidents}
              columns={columns}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          </div>
        </div>
        {/* Add Resident Modal */}
        <Modal
          title="Add Resident"
          open={addOpen}
          onCancel={() => setAddOpen(false)}
          onOk={handleAddResident}
          confirmLoading={creating}
          okText="Add"
          width={600}
        >
          <Form form={addForm} layout="vertical">
            <Form.Item name="username" label="Username" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="middleName" label="Middle Name">
              <Input />
            </Form.Item>
            <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="suffix" label="Suffix">
              <Input />
            </Form.Item>
            <Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true }]}>
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="birthPlace" label="Birth Place" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Other" },
                ]}
              />
            </Form.Item>
            <Form.Item name="civilStatus" label="Civil Status" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "single", label: "Single" },
                  { value: "married", label: "Married" },
                  { value: "widowed", label: "Widowed" },
                  { value: "separated", label: "Separated" },
                ]}
              />
            </Form.Item>
            <Form.Item name={["address", "street"]} label="Street" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={["address", "purok"]} label="Purok" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "Purok 1", label: "Purok 1" },
                  { value: "Purok 2", label: "Purok 2" },
                  { value: "Purok 3", label: "Purok 3" },
                  { value: "Purok 4", label: "Purok 4" },
                  { value: "Purok 5", label: "Purok 5" },
                ]}
              />
            </Form.Item>
            <Form.Item name={["address", "barangay"]} label="Barangay" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={["address", "municipality"]} label="Municipality" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={["address", "province"]} label="Province" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={["address", "zipCode"]} label="ZIP Code">
              <Input />
            </Form.Item>
            <Form.Item name="citizenship" label="Citizenship" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="occupation" label="Occupation" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="education" label="Education" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={["contact", "mobile"]} label="Mobile" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={["contact", "email"]} label="Email" rules={[{ required: true, type: "email" }]}>
              <Input />
            </Form.Item>
          </Form>
        </Modal>
        {/* Edit Resident Modal */}
        <Modal
          title="Edit Resident"
          open={editOpen}
          onCancel={() => setEditOpen(false)}
          onOk={handleEditResident}
          confirmLoading={editing}
          okText="Save"
          width={600}
        >
          <Form form={editForm} layout="vertical">
            <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="middleName" label="Middle Name">
              <Input />
            </Form.Item>
            <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="suffix" label="Suffix">
              <Input />
            </Form.Item>
            <Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true }]}>
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="birthPlace" label="Birth Place" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Other" },
                ]}
              />
            </Form.Item>
            <Form.Item name="civilStatus" label="Civil Status" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "single", label: "Single" },
                  { value: "married", label: "Married" },
                  { value: "widowed", label: "Widowed" },
                  { value: "separated", label: "Separated" },
                ]}
              />
            </Form.Item>
            <Form.Item name={["address", "street"]} label="Street" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={["address", "purok"]} label="Purok" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "Purok 1", label: "Purok 1" },
                  { value: "Purok 2", label: "Purok 2" },
                  { value: "Purok 3", label: "Purok 3" },
                  { value: "Purok 4", label: "Purok 4" },
                  { value: "Purok 5", label: "Purok 5" },
                ]}
              />
            </Form.Item>
            <Form.Item name={["address", "barangay"]} label="Barangay" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={["address", "municipality"]} label="Municipality" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={["address", "province"]} label="Province" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={["address", "zipCode"]} label="ZIP Code">
              <Input />
            </Form.Item>
            <Form.Item name="citizenship" label="Citizenship" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="occupation" label="Occupation" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="education" label="Education" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={["contact", "mobile"]} label="Mobile" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={["contact", "email"]} label="Email" rules={[{ required: true, type: "email" }]}>
              <Input />
            </Form.Item>
          </Form>
        </Modal>
        {/* View Resident Modal */}
        <Modal
          title="Resident Details"
          open={viewOpen}
          onCancel={() => setViewOpen(false)}
          footer={null}
          width={700}
        >
          {viewResident && (
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Full Name">
                {[viewResident.firstName, viewResident.middleName, viewResident.lastName, viewResident.suffix].filter(Boolean).join(" ")}
              </Descriptions.Item>
              <Descriptions.Item label="Username">{viewResident.username}</Descriptions.Item>
              <Descriptions.Item label="Gender">{viewResident.gender}</Descriptions.Item>
              <Descriptions.Item label="Date of Birth">{viewResident.dateOfBirth ? new Date(viewResident.dateOfBirth).toLocaleDateString() : ""}</Descriptions.Item>
              <Descriptions.Item label="Civil Status">{viewResident.civilStatus}</Descriptions.Item>
              <Descriptions.Item label="Birth Place">{viewResident.birthPlace}</Descriptions.Item>
              <Descriptions.Item label="Citizenship">{viewResident.citizenship}</Descriptions.Item>
              <Descriptions.Item label="Occupation">{viewResident.occupation}</Descriptions.Item>
              <Descriptions.Item label="Education">{viewResident.education}</Descriptions.Item>
              <Descriptions.Item label="Mobile">{viewResident.contact?.mobile}</Descriptions.Item>
              <Descriptions.Item label="Email">{viewResident.contact?.email}</Descriptions.Item>
              <Descriptions.Item label="Address">
                {[
                  viewResident.address?.street,
                  viewResident.address?.barangay,
                  viewResident.address?.municipality,
                  viewResident.address?.province,
                  viewResident.address?.zipCode,
                ].filter(Boolean).join(", ")}
              </Descriptions.Item>
              <Descriptions.Item label="Purok">{viewResident.address?.purok}</Descriptions.Item>
              <Descriptions.Item label="Status">{viewResident.status}</Descriptions.Item>
              <Descriptions.Item label="Blockchain Hash">{viewResident.blockchain?.hash || "-"}</Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}