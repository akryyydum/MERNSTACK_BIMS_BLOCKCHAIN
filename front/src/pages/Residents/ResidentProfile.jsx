import React, { useState, useEffect } from 'react';
import { Descriptions, Typography, Layout, message, Spin, Avatar } from 'antd';
import { 
  UserOutlined, 
  HomeOutlined, 
  PhoneOutlined, 
  SettingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  BankOutlined
} from '@ant-design/icons';
import ResidentNavbar from './ResidentNavbar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from 'axios';

const { Title } = Typography;
const { Content } = Layout;

const ResidentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/resident/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      message.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    const parts = [
      address.purok,
      address.barangay,
      address.municipality,
      address.province
    ].filter(Boolean);
    if (address.zipCode) parts.push(address.zipCode);
    return parts.join(', ');
  };

  const getFullName = () => {
    if (!profile) return '';
    const parts = [
      profile.firstName,
      profile.middleName,
      profile.lastName,
      profile.suffix
    ].filter(Boolean);
    return parts.join(' ');
  };

  if (loading) {
    return (
      <div>
        <ResidentNavbar />
        <main className="mx-auto w-full max-w-9xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <Spin size="large" />
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        <ResidentNavbar />
        <main className="mx-auto w-full max-w-9xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
          <Card className="w-full">
            <CardContent className="text-center py-12">
              <Title level={3}>Profile not found</Title>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ResidentNavbar />
      <main className="mx-auto w-full max-w-9xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-slate-900">
              My Profile
            </CardTitle>
            <p className="text-slate-600">
              View your complete resident profile information, contact details, and account status.
            </p>
          </CardHeader>
        </Card>

        {/* Profile Header */}
        <Card className={`w-full border ${
          profile.status === 'verified' 
            ? 'border-emerald-200 bg-emerald-50' 
            : profile.status === 'pending'
            ? 'border-amber-200 bg-amber-50'
            : 'border-rose-200 bg-rose-50'
        }`}>
          <CardContent className="text-center py-8">
            <Avatar size={80} icon={<UserOutlined />} className="mb-4" />
            <Title level={2} className="mb-3">{getFullName()}</Title>
            
            {/* Status Badge */}
            <div className="flex justify-center mb-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                profile.status === 'verified'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : profile.status === 'pending'
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : 'bg-rose-100 text-rose-700 border border-rose-200'
              }`}>
                {profile.status === 'verified' && <CheckCircleOutlined className="mr-1" />}
                {profile.status === 'pending' && <ClockCircleOutlined className="mr-1" />}
                {profile.status === 'rejected' && <CloseCircleOutlined className="mr-1" />}
                {profile.status?.charAt(0).toUpperCase() + profile.status?.slice(1)}
              </span>
            </div>

            {profile.user?.role === 'official' && (
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-sm font-medium">
                <BankOutlined className="mr-1" />
                Barangay Official
                {profile.user?.position && ` - ${profile.user.position}`}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <Card className="w-full hover:shadow-md transition-shadow border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserOutlined className="text-slate-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Descriptions column={1} size="middle" bordered>
                <Descriptions.Item label="Full Name">{getFullName()}</Descriptions.Item>
                <Descriptions.Item label="Date of Birth">{formatDate(profile.dateOfBirth)}</Descriptions.Item>
                <Descriptions.Item label="Birth Place">{profile.birthPlace || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Gender">{profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Civil Status">{profile.civilStatus ? profile.civilStatus.charAt(0).toUpperCase() + profile.civilStatus.slice(1) : 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Religion">{profile.religion || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Ethnicity">{profile.ethnicity || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Citizenship">{profile.citizenship || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Occupation">{profile.occupation || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Sectoral Information">{profile.sectoralInformation || 'None'}</Descriptions.Item>
              </Descriptions>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className="w-full hover:shadow-md transition-shadow border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HomeOutlined className="text-slate-600" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Descriptions column={1} size="middle" bordered>
                <Descriptions.Item label="Purok">{profile.address?.purok || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Barangay">{profile.address?.barangay || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Municipality">{profile.address?.municipality || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Province">{profile.address?.province || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="ZIP Code">{profile.address?.zipCode || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Complete Address">{formatAddress(profile.address)}</Descriptions.Item>
              </Descriptions>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="w-full hover:shadow-md transition-shadow border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhoneOutlined className="text-slate-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Descriptions column={1} size="middle" bordered>
                <Descriptions.Item label="Mobile Number">{profile.contact?.mobile || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Email Address">{profile.contact?.email || 'N/A'}</Descriptions.Item>
              </Descriptions>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card className="w-full hover:shadow-md transition-shadow border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingOutlined className="text-slate-600" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Descriptions column={1} size="middle" bordered>
                <Descriptions.Item label="Username">{profile.user?.username || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Role">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    profile.user?.role === 'official' 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'bg-green-100 text-green-700 border border-green-200'
                  }`}>
                    {profile.user?.role?.charAt(0).toUpperCase() + profile.user?.role?.slice(1) || 'N/A'}
                  </span>
                </Descriptions.Item>
                {profile.user?.role === 'official' && profile.user?.position && (
                  <Descriptions.Item label="Position">{profile.user.position}</Descriptions.Item>
                )}
                <Descriptions.Item label="Account Status">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    profile.user?.isActive
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-100 text-rose-700 border border-rose-200'
                  }`}>
                    {profile.user?.isActive ? (
                      <>
                        <CheckCircleOutlined className="mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <CloseCircleOutlined className="mr-1" />
                        Inactive
                      </>
                    )}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Verified">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    profile.user?.isVerified
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-100 text-rose-700 border border-rose-200'
                  }`}>
                    {profile.user?.isVerified ? (
                      <>
                        <CheckCircleOutlined className="mr-1" />
                        Verified
                      </>
                    ) : (
                      <>
                        <CloseCircleOutlined className="mr-1" />
                        Not Verified
                      </>
                    )}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Registration Date">{formatDate(profile.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="Last Updated">{formatDate(profile.updatedAt)}</Descriptions.Item>
              </Descriptions>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ResidentProfile;