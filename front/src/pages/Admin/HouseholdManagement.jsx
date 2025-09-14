import React, { useEffect, useState } from "react";
import { Table, Input, Button, Modal, Form, Select, message, Popconfirm, Descriptions } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { UserOutlined } from "@ant-design/icons";
import axios from "axios";

// Hardcoded sample data for development
const sampleResidents = [
  {
    _id: "r1",
    firstName: "Juan",
    middleName: "Dela",
    lastName: "Cruz",
    gender: "male",
    dateOfBirth: "1985-05-15",
    contact: { mobile: "09123456789", email: "juan@example.com" },
    address: {
      street: "123 Main St.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 1"
    },
    status: "verified"
  },
  {
    _id: "r2",
    firstName: "Maria",
    middleName: "Santos",
    lastName: "Garcia",
    gender: "female",
    dateOfBirth: "1990-08-20",
    contact: { mobile: "09876543210", email: "maria@example.com" },
    address: {
      street: "456 Oak Ave.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 2"
    },
    status: "verified"
  },
  {
    _id: "r3",
    firstName: "Pedro",
    middleName: "Reyes",
    lastName: "Santos",
    gender: "male",
    dateOfBirth: "1982-03-10",
    contact: { mobile: "09567891234", email: "pedro@example.com" },
    address: {
      street: "789 Elm St.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 3"
    },
    status: "verified"
  },
  {
    _id: "r4",
    firstName: "Rosa",
    middleName: "Cruz",
    lastName: "Reyes",
    gender: "female",
    dateOfBirth: "1995-11-05",
    contact: { mobile: "09234567891", email: "rosa@example.com" },
    address: {
      street: "101 Pine St.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 2"
    },
    status: "verified"
  },
  {
    _id: "r5",
    firstName: "Antonio",
    middleName: "Gonzales",
    lastName: "Martinez",
    gender: "male",
    dateOfBirth: "1978-07-22",
    contact: { mobile: "09345678912", email: "antonio@example.com" },
    address: {
      street: "202 Cedar St.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 4"
    },
    status: "verified"
  }
];

const sampleHouseholds = [
  {
    _id: "h1",
    householdId: "HH-2023-001",
    headOfHousehold: "r1",
    members: ["r1", "r2"],
    address: {
      street: "123 Main St.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 1",
      zipCode: "3700"
    },
  },
  {
    _id: "h2",
    householdId: "HH-2023-002",
    headOfHousehold: "r3",
    members: ["r3", "r4"],
    address: {
      street: "789 Elm St.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 3",
      zipCode: "3700"
    },
  },
  {
    _id: "h3",
    householdId: "HH-2023-003",
    headOfHousehold: "r5",
    members: ["r5"],
    address: {
      street: "202 Cedar St.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 4",
      zipCode: "3700"
    },
  }
];

export default function HouseholdManagement() {
  const [loading, setLoading] = useState(false);
  const [households, setHouseholds] = useState(sampleHouseholds);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewHousehold, setViewHousehold] = useState(null);
  const [residents, setResidents] = useState(sampleResidents);

  // Get user info from localStorage
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  useEffect(() => {
    // For demonstration purposes, we're using the hardcoded data
    // No need to fetch from API during initial development
    setLoading(false);
  }, []);

  // These functions are kept for future API implementation
  const fetchHouseholds = async () => {
    // Using hardcoded data for now
    setHouseholds(sampleHouseholds);
  };

  const fetchResidents = async () => {
    // Using hardcoded data for now
    setResidents(sampleResidents);
  };

  // Add Household
  const handleAddHousehold = async () => {
    try {
      setCreating(true);
      const values = await addForm.validateFields();
      // Inject fixed address fields
      const address = {
        ...values.address,
        barangay: "La Torre North",
        municipality: "Bayombong",
        province: "Nueva Vizcaya",
        zipCode: "3700",
      };
      // Create new household with a mock ID
      const newHousehold = {
        _id: `h${households.length + 1}`,
        ...values,
        address
      };
      setHouseholds([...households, newHousehold]);
      message.success("Household added!");
      setAddOpen(false);
      addForm.resetFields();
    } catch (err) {
      message.error("Failed to add household");
      console.error(err);
    }
    setCreating(false);
  };

  // Edit Household
  const openEdit = (household) => {
    setSelectedHousehold(household);
    // Remove barangay, municipality, province, zipCode from form fields
    const { barangay, municipality, province, zipCode, ...addressRest } = household.address || {};
    editForm.setFieldsValue({
      ...household,
      address: addressRest,
      members: household.members?.map(m => m._id || m),
    });
    setEditOpen(true);
  };

  const handleEditHousehold = async () => {
    try {
      setEditing(true);
      const values = await editForm.validateFields();
      // Inject fixed address fields
      const address = {
        ...values.address,
        barangay: "La Torre North",
        municipality: "Bayombong",
        province: "Nueva Vizcaya",
        zipCode: "3700",
      };
      // Update household in the state
      const updatedHouseholds = households.map(h =>
        h._id === selectedHousehold._id
          ? { ...h, ...values, address }
          : h
      );
      setHouseholds(updatedHouseholds);
      message.success("Household updated!");
      setEditOpen(false);
    } catch (err) {
      message.error("Failed to update household");
      console.error(err);
    }
    setEditing(false);
  };

  // Delete Household
  const handleDelete = async (id) => {
    try {
      // Remove household from state
      const filteredHouseholds = households.filter(h => h._id !== id);
      setHouseholds(filteredHouseholds);
      message.success("Household deleted!");
    } catch (err) {
      message.error("Failed to delete household");
      console.error(err);
    }
  };

  // View Household Details
  const openView = (household) => {
    // For hardcoded data, we need to fetch the actual resident objects 
    // using the member IDs
    const householdWithMembers = {
      ...household,
      // Convert references to actual resident objects for display
      memberDetails: household.members.map(memberId => 
        residents.find(r => r._id === memberId) || { firstName: "Unknown", lastName: "Resident" }
      )
    };
    
    setViewHousehold(householdWithMembers);
    setViewOpen(true);
  };

  // Statistics
  const totalHouseholds = households.length;
  const totalMembers = households.reduce((acc, h) => acc + (h.members?.length || 0), 0);
  const avgHouseholdSize = totalHouseholds > 0 ? (totalMembers / totalHouseholds).toFixed(1) : 0;
  const singleMemberHouseholds = households.filter(h => h.members?.length === 1).length;
  const familyHouseholds = households.filter(h => h.members?.length > 1).length;

  const columns = [
    {
      title: "Household ID",
      dataIndex: "householdId",
      key: "householdId",
    },
    {
      title: "Head of Household",
      key: "headOfHousehold",
      render: (_, record) => {
        const headMember = record.headOfHousehold ? 
          (residents.find(r => r._id === record.headOfHousehold) || {}) : {};
        return [headMember.firstName, headMember.middleName, headMember.lastName]
          .filter(Boolean)
          .join(" ") || "Not specified";
      },
    },
    {
      title: "Address",
      key: "address",
      render: (_, r) =>
        `${r.address?.street || ""}, ${r.address?.barangay || ""}, ${r.address?.municipality || ""}, ${r.address?.province || ""}`,
    },
    {
      title: "Members Count",
      key: "membersCount",
      render: (_, record) => record.members?.length || 0,
    },
    {
      title: "Purok",
      dataIndex: ["address", "purok"],
      key: "purok",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => openView(r)}>View</Button>
          <Button size="small" onClick={() => openEdit(r)}>Edit</Button>
          <Popconfirm
            title="Delete household?"
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

  const filteredHouseholds = households.filter(h =>
    [
      h.householdId,
      h.address?.street,
      h.address?.barangay,
      h.address?.municipality,
      h.address?.province,
      h.address?.purok,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Get resident options for select inputs
  const residentOptions = residents.map(r => ({
    label: `${r.firstName} ${r.middleName || ''} ${r.lastName}`,
    value: r._id,
  }));

  return (
    <AdminLayout title="Admin">
      <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">
                Household Management
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
                    Total Households
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {totalHouseholds}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {totalHouseholds}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Total Members
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {totalMembers}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {totalMembers}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Avg. Household Size
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {avgHouseholdSize}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {avgHouseholdSize}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black shadow-md py-10 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Single Member
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {singleMemberHouseholds}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {singleMemberHouseholds}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-10 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Family Households
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {familyHouseholds}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {familyHouseholds}
                  </div>
                </CardContent>
              </Card>
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
                placeholder="Search households"
                onSearch={v => setSearch(v.trim())}
                value={search}
                onChange={e => setSearch(e.target.value)}
                enterButton
                className="min-w-[180px] max-w-xs"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="primary" onClick={() => setAddOpen(true)}>
                Add Household
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table
              rowKey="_id"
              loading={loading}
              dataSource={filteredHouseholds}
              columns={columns}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          </div>
        </div>
        {/* Add Household Modal */}
        <Modal
          title="Add Household"
          open={addOpen}
          onCancel={() => setAddOpen(false)}
          onOk={handleAddHousehold}
          confirmLoading={creating}
          okText="Add"
          width={600}
        >
          <Form form={addForm} layout="vertical">

            <Form.Item name="headOfHousehold" label="Head of Household" rules={[{ required: true }]}>
              <Select
                options={residentOptions}
                showSearch
                optionFilterProp="label"
                placeholder="Select head of household"
              />
            </Form.Item>
            <Form.Item name="members" label="Household Members" rules={[{ required: true }]}>
              <Select
                mode="multiple"
                options={residentOptions}
                showSearch
                optionFilterProp="label"
                placeholder="Select household members"
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
            {/* Barangay, Municipality, Province, and ZIP Code are auto-filled */}
          </Form>
        </Modal>
        {/* Edit Household Modal */}
        <Modal
          title="Edit Household"
          open={editOpen}
          onCancel={() => setEditOpen(false)}
          onOk={handleEditHousehold}
          confirmLoading={editing}
          okText="Save"
          width={600}
        >
          <Form form={editForm} layout="vertical">
            <Form.Item name="householdId" label="Household ID" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="headOfHousehold" label="Head of Household" rules={[{ required: true }]}>
              <Select
                options={residentOptions}
                showSearch
                optionFilterProp="label"
                placeholder="Select head of household"
              />
            </Form.Item>
            <Form.Item name="members" label="Household Members" rules={[{ required: true }]}>
              <Select
                mode="multiple"
                options={residentOptions}
                showSearch
                optionFilterProp="label"
                placeholder="Select household members"
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
            {/* Barangay, Municipality, Province, and ZIP Code are auto-filled */}
          </Form>
        </Modal>
        {/* View Household Modal */}
        <Modal
          title="Household Details"
          open={viewOpen}
          onCancel={() => setViewOpen(false)}
          footer={null}
          width={700}
        >
          {viewHousehold && (
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Household ID">{viewHousehold.householdId}</Descriptions.Item>
              <Descriptions.Item label="Head of Household">
                {(() => {
                  const headMember = viewHousehold.headOfHousehold ? 
                    (residents.find(r => r._id === viewHousehold.headOfHousehold) || {}) : {};
                  return [headMember.firstName, headMember.middleName, headMember.lastName]
                    .filter(Boolean)
                    .join(" ") || "Not specified";
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Number of Members">
                {viewHousehold.members?.length || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Members">
                <ul className="list-disc pl-5">
                  {viewHousehold.members?.map(memberId => {
                    const member = residents.find(r => r._id === memberId) || {};
                    return (
                      <li key={memberId}>
                        {[member.firstName, member.middleName, member.lastName]
                          .filter(Boolean)
                          .join(" ") || "Unknown Member"}
                        {member._id === viewHousehold.headOfHousehold && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Head of Household
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Descriptions.Item>
              <Descriptions.Item label="Address">
                {[
                  viewHousehold.address?.street,
                  viewHousehold.address?.barangay,
                  viewHousehold.address?.municipality,
                  viewHousehold.address?.province,
                  viewHousehold.address?.zipCode,
                ].filter(Boolean).join(", ")}
              </Descriptions.Item>
              <Descriptions.Item label="Purok">{viewHousehold.address?.purok}</Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
