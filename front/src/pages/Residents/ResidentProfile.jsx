import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Typography, Layout, message, Spin, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import ResidentNavbar from './ResidentNavbar';
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
      <Layout style={{ minHeight: '100vh' }}>
        <ResidentNavbar />
        <Content style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <ResidentNavbar />
        <Content style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <Title level={3}>Profile not found</Title>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <ResidentNavbar />
      <Content style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <Avatar size={80} icon={<UserOutlined />} style={{ marginBottom: '16px' }} />
          <Title level={2} style={{ margin: 0 }}>{getFullName()}</Title>
          <div style={{ color: '#666', fontSize: '16px', marginBottom: '8px' }}>
            Status: <span style={{ 
              color: profile.status === 'verified' ? '#52c41a' : 
                     profile.status === 'pending' ? '#faad14' : '#ff4d4f',
              fontWeight: 'bold',
              textTransform: 'capitalize'
            }}>
              {profile.status}
            </span>
          </div>
          {profile.user?.role === 'official' && (
            <div style={{ color: '#1890ff', fontSize: '16px', fontWeight: 'bold' }}>
              🏛️ Barangay Official
              {profile.user?.position && ` - ${profile.user.position}`}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
          {/* Personal Information */}
          <Card title="Personal Information" bordered>
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
          </Card>

          {/* Address Information */}
          <Card title="Address Information" bordered>
            <Descriptions column={1} size="middle" bordered>
              <Descriptions.Item label="Purok">{profile.address?.purok || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Barangay">{profile.address?.barangay || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Municipality">{profile.address?.municipality || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Province">{profile.address?.province || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="ZIP Code">{profile.address?.zipCode || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Complete Address">{formatAddress(profile.address)}</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Contact Information */}
          <Card title="Contact Information" bordered>
            <Descriptions column={1} size="middle" bordered>
              <Descriptions.Item label="Mobile Number">{profile.contact?.mobile || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Email Address">{profile.contact?.email || 'N/A'}</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Account Information */}
          <Card title="Account Information" bordered>
            <Descriptions column={1} size="middle" bordered>
              <Descriptions.Item label="Username">{profile.user?.username || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Role">
                <span style={{ 
                  color: profile.user?.role === 'official' ? '#1890ff' : '#52c41a', 
                  fontWeight: 'bold',
                  textTransform: 'capitalize'
                }}>
                  {profile.user?.role || 'N/A'}
                </span>
              </Descriptions.Item>
              {profile.user?.role === 'official' && profile.user?.position && (
                <Descriptions.Item label="Position">{profile.user.position}</Descriptions.Item>
              )}
              <Descriptions.Item label="Account Status">
                {profile.user?.isActive ? 
                  <span style={{ color: '#52c41a', fontWeight: 'bold' }}>Active</span> : 
                  <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>Inactive</span>
                }
              </Descriptions.Item>
              <Descriptions.Item label="Verified">
                {profile.user?.isVerified ? 
                  <span style={{ color: '#52c41a', fontWeight: 'bold' }}>Yes</span> : 
                  <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>No</span>
                }
              </Descriptions.Item>
              <Descriptions.Item label="Registration Date">{formatDate(profile.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="Last Updated">{formatDate(profile.updatedAt)}</Descriptions.Item>
            </Descriptions>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default ResidentProfile;