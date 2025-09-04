import React, { useEffect, useState } from "react";
import { Table, Input } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import axios from "axios";

export default function AdminResidentManagement() {
  const [loading, setLoading] = useState(false);
  const [residents, setResidents] = useState([]);
  const [search, setSearch] = useState("");

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
    { title: "Status", dataIndex: "status", key: "status",
      render: v => (
        <span
          className={
            v === "verified"
              ? "text-green-600 font-semibold"
              : v === "rejected"
              ? "text-red-600 font-semibold"
              : "text-yellow-600 font-semibold"
          }
        >
          {v?.charAt(0).toUpperCase() + v?.slice(1)}
        </span>
      ),
    },
    {
      title: "Blockchain Hash",
      dataIndex: ["blockchain", "hash"],
      key: "blockchainHash",
      render: (_, r) => r.blockchain?.hash || "-",
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

  return (
    <AdminLayout title="Admin">
      <div className="space-y-4 px-2 md:px-8">
        {/* Navbar */}
        <div className="bg-white rounded-2xl shadow-sm mb-4">
          <nav className="px-4 h-20 flex items-center">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-800">
              Residents Management
            </h1>
          </nav>
          {/* Statistics Section */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4">
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
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4">
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
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4">
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-3">
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-10 p-4">
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
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-10 p-4">
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
        <div className="bg-white rounded-2xl shadow-2xl p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
            <Input.Search
              placeholder="Search residents"
              allowClear
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 300 }}
            />
            {/* Add button for new resident if needed */}
          </div>
          <div className="overflow-x-auto">
            <Table
              rowKey="_id"
              loading={loading}
              dataSource={filteredResidents}
              columns={columns}
              pagination={{ pageSize: 10 }}
              scroll={{ x: true }}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}