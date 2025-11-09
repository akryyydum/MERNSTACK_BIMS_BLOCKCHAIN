import React, { useState, useEffect } from 'react';
import { Descriptions, Typography, Layout, message, Spin, Avatar, Input, Select, DatePicker, Button } from 'antd';
import { 
  UserOutlined, 
  HomeOutlined, 
  PhoneOutlined, 
  SettingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  BankOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
import ResidentNavbar from './ResidentNavbar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from 'axios';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Content } = Layout;
const { Option } = Select;

const ResidentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(null);
  const [saving, setSaving] = useState(false);

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
      setEditedProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      message.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile({ ...profile });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile({ ...profile });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/resident/profile`,
        editedProfile,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      const updatedResident = response.data.resident;
      setProfile(updatedResident);
      setEditedProfile(updatedResident);
      setIsEditing(false);
      
      // Update localStorage with new data
      const userData = {
        firstName: updatedResident.firstName,
        middleName: updatedResident.middleName,
        lastName: updatedResident.lastName,
        suffix: updatedResident.suffix,
        email: updatedResident.contact?.email,
        mobile: updatedResident.contact?.mobile
      };
      localStorage.setItem('userData', JSON.stringify(userData));
      
      // Dispatch custom event to notify navbar and other components
      window.dispatchEvent(new Event('profileUpdated'));
      
      message.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      message.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (field, value) => {
    setEditedProfile(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  const handleContactChange = (field, value) => {
    setEditedProfile(prev => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: value
      }
    }));
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

  const getFullName = (data = profile) => {
    if (!data) return '';
    const parts = [
      data.firstName,
      data.middleName,
      data.lastName,
      data.suffix
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
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-semibold text-slate-900">
                  My Profile
                </CardTitle>
                <p className="text-slate-600">
                  {isEditing 
                    ? 'Edit your resident profile information' 
                    : 'View your complete resident profile information, contact details, and account status.'}
                </p>
              </div>
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button 
                    type="primary" 
                    icon={<EditOutlined />}
                    onClick={handleEdit}
                    size="large"
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button 
                      icon={<CloseOutlined />}
                      onClick={handleCancel}
                      size="large"
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSave}
                      size="large"
                      loading={saving}
                    >
                      Save Changes
                    </Button>
                  </>
                )}
              </div>
            </div>
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
                <Descriptions.Item label="First Name">
                  {isEditing ? (
                    <Input 
                      value={editedProfile?.firstName} 
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                    />
                  ) : (profile.firstName || 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Middle Name">
                  {isEditing ? (
                    <Input 
                      value={editedProfile?.middleName} 
                      onChange={(e) => handleInputChange('middleName', e.target.value)}
                    />
                  ) : (profile.middleName || 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Last Name">
                  {isEditing ? (
                    <Input 
                      value={editedProfile?.lastName} 
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                    />
                  ) : (profile.lastName || 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Suffix">
                  {isEditing ? (
                    <Input 
                      value={editedProfile?.suffix} 
                      onChange={(e) => handleInputChange('suffix', e.target.value)}
                      placeholder="Jr., Sr., III, etc."
                    />
                  ) : (profile.suffix || 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Date of Birth">
                  {isEditing ? (
                    <DatePicker 
                      value={editedProfile?.dateOfBirth ? dayjs(editedProfile.dateOfBirth) : null}
                      onChange={(date) => handleInputChange('dateOfBirth', date ? date.toISOString() : null)}
                      format="YYYY-MM-DD"
                      style={{ width: '100%' }}
                    />
                  ) : formatDate(profile.dateOfBirth)}
                </Descriptions.Item>
                <Descriptions.Item label="Birth Place">
                  {isEditing ? (
                    <Input 
                      value={editedProfile?.birthPlace} 
                      onChange={(e) => handleInputChange('birthPlace', e.target.value)}
                    />
                  ) : (profile.birthPlace || 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Gender">
                  {isEditing ? (
                    <Select 
                      value={editedProfile?.sex} 
                      onChange={(value) => handleInputChange('sex', value)}
                      style={{ width: '100%' }}
                    >
                      <Option value="male">Male</Option>
                      <Option value="female">Female</Option>
                      <Option value="other">Other</Option>
                    </Select>
                  ) : (profile.sex ? profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1) : 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Civil Status">
                  {isEditing ? (
                    <Select 
                      value={editedProfile?.civilStatus} 
                      onChange={(value) => handleInputChange('civilStatus', value)}
                      style={{ width: '100%' }}
                    >
                      <Option value="single">Single</Option>
                      <Option value="married">Married</Option>
                      <Option value="widowed">Widowed</Option>
                      <Option value="separated">Separated</Option>
                    </Select>
                  ) : (profile.civilStatus ? profile.civilStatus.charAt(0).toUpperCase() + profile.civilStatus.slice(1) : 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Religion">
                  {isEditing ? (
                    <Input 
                      value={editedProfile?.religion} 
                      onChange={(e) => handleInputChange('religion', e.target.value)}
                    />
                  ) : (profile.religion || 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Ethnicity">
                  {isEditing ? (
                    <Input 
                      value={editedProfile?.ethnicity} 
                      onChange={(e) => handleInputChange('ethnicity', e.target.value)}
                    />
                  ) : (profile.ethnicity || 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Citizenship">
                  {isEditing ? (
                    <Input 
                      value={editedProfile?.citizenship} 
                      onChange={(e) => handleInputChange('citizenship', e.target.value)}
                    />
                  ) : (profile.citizenship || 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Occupation">
                  {isEditing ? (
                    <Input 
                      value={editedProfile?.occupation} 
                      onChange={(e) => handleInputChange('occupation', e.target.value)}
                    />
                  ) : (profile.occupation || 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Sectoral Information">
                  {isEditing ? (
                    <Select 
                      value={editedProfile?.sectoralInformation} 
                      onChange={(value) => handleInputChange('sectoralInformation', value)}
                      style={{ width: '100%' }}
                    >
                      <Option value="None">None</Option>
                      <Option value="Solo Parent">Solo Parent</Option>
                      <Option value="OFW">OFW</Option>
                      <Option value="PWD">PWD</Option>
                      <Option value="OSC - Out of School Children">OSC - Out of School Children</Option>
                      <Option value="OSC - Out of School Youth">OSC - Out of School Youth</Option>
                      <Option value="OSC - Out of School Adult">OSC - Out of School Adult</Option>
                    </Select>
                  ) : (profile.sectoralInformation || 'None')}
                </Descriptions.Item>
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
                <Descriptions.Item label="Purok">
                  {isEditing ? (
                    <Select 
                      value={editedProfile?.address?.purok} 
                      onChange={(value) => handleAddressChange('purok', value)}
                      style={{ width: '100%' }}
                    >
                      <Option value="Purok 1">Purok 1</Option>
                      <Option value="Purok 2">Purok 2</Option>
                      <Option value="Purok 3">Purok 3</Option>
                      <Option value="Purok 4">Purok 4</Option>
                      <Option value="Purok 5">Purok 5</Option>
                    </Select>
                  ) : (profile.address?.purok || 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Barangay">
                  {isEditing ? (
                    <Input 
                      value={editedProfile?.address?.barangay} 
                      onChange={(e) => handleAddressChange('barangay', e.target.value)}
                    />
                  ) : (profile.address?.barangay || 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Municipality">
                  {isEditing ? (
                    <Input 
                      value={editedProfile?.address?.municipality} 
                      onChange={(e) => handleAddressChange('municipality', e.target.value)}
                    />
                  ) : (profile.address?.municipality || 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Province">
                  {isEditing ? (
                    <Input 
                      value={editedProfile?.address?.province} 
                      onChange={(e) => handleAddressChange('province', e.target.value)}
                    />
                  ) : (profile.address?.province || 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="ZIP Code">
                  {isEditing ? (
                    <Input 
                      value={editedProfile?.address?.zipCode} 
                      onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                    />
                  ) : (profile.address?.zipCode || 'N/A')}
                </Descriptions.Item>
                {!isEditing && (
                  <Descriptions.Item label="Complete Address">{formatAddress(profile.address)}</Descriptions.Item>
                )}
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
                <Descriptions.Item label="Mobile Number">
                  {isEditing ? (
                    <Input 
                      value={editedProfile?.contact?.mobile} 
                      onChange={(e) => handleContactChange('mobile', e.target.value)}
                      placeholder="e.g., 09171234567"
                    />
                  ) : (profile.contact?.mobile || 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Email Address">
                  {isEditing ? (
                    <Input 
                      value={editedProfile?.contact?.email} 
                      onChange={(e) => handleContactChange('email', e.target.value)}
                      type="email"
                      placeholder="e.g., email@example.com"
                    />
                  ) : (profile.contact?.email || 'N/A')}
                </Descriptions.Item>
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