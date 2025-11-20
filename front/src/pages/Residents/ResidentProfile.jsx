// Custom hook to detect if screen is mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}
import React, { useState, useEffect } from 'react';


import { Descriptions, Typography, Layout, message, Spin, Avatar, Input, Select, DatePicker, Button, Alert } from 'antd';
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [mobileTaken, setMobileTaken] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [allResidents, setAllResidents] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchProfile();
    fetchAllResidents();
    fetchAllUsers();
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

  const fetchAllResidents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/admin/residents?limit=10000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllResidents(response.data.items || []);
    } catch (error) {
      console.error('Error fetching residents:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/admin/users?limit=10000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllUsers(response.data.items || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile({ ...profile });
    setEmailTaken(false);
    setMobileTaken(false);
    setUsernameTaken(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile({ ...profile });
    setEmailTaken(false);
    setMobileTaken(false);
    setUsernameTaken(false);
  };

  // Validation function for fields that should not contain numbers or special characters
  const isAlphaOnly = (value) => {
    // Allow spaces, letters, and hyphens (-)
    return /^[A-Za-z\s-]+$/.test(value || '');
  };

  // Validation function for username
  const isValidUsername = (value) => {
    // Allow letters, numbers, dots, underscores, and hyphens
    return /^[a-zA-Z0-9._-]+$/.test(value || '');
  };

  // Validation function for mobile number (Philippine format)
  const isValidMobile = (value) => {
    if (!value || value.trim() === '') return true; // Optional field
    // Must be numbers only, minimum 11 and maximum 12 digits
    return /^\d{11,12}$/.test(value || '');
  };

  // Validation function for email format
  const isValidEmail = (value) => {
    if (!value || value.trim() === '') return true; // Optional field
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSave = async () => {
    // Validate name fields before saving
    const fieldsToValidate = [
      { key: 'firstName', label: 'First Name', value: editedProfile?.firstName, required: true },
      { key: 'middleName', label: 'Middle Name', value: editedProfile?.middleName, required: false },
      { key: 'lastName', label: 'Last Name', value: editedProfile?.lastName, required: true },
      { key: 'religion', label: 'Religion', value: editedProfile?.religion, required: false },
      { key: 'ethnicity', label: 'Ethnicity', value: editedProfile?.ethnicity, required: false },
    ];
    const newFieldErrors = {};
    
    // Validate name, religion, and ethnicity fields (alphabetic with spaces and hyphens)
    for (const field of fieldsToValidate) {
      if (field.required && (!field.value || field.value.trim() === '')) {
        newFieldErrors[field.key] = `${field.label} is required`;
      } else if (field.value && !isAlphaOnly(field.value)) {
        newFieldErrors[field.key] = `${field.label} may contain letters, spaces, and hyphens (-) only`;
      }
    }
    
    // Validate username
    const username = editedProfile?.user?.username;
    if (!username || username.trim() === '') {
      newFieldErrors['username'] = 'Username is required';
    } else if (username.length < 6) {
      newFieldErrors['username'] = 'Username must be at least 6 characters';
    } else if (!isValidUsername(username)) {
      newFieldErrors['username'] = 'Username may contain letters, numbers, . _ - only';
    }
    
    // Validate email format
    const email = editedProfile?.contact?.email;
    if (email && email.trim() && !isValidEmail(email)) {
      newFieldErrors['email'] = 'Please enter a valid email address';
    }
    
    // Validate mobile format
    const mobile = editedProfile?.contact?.mobile;
    if (mobile && mobile.trim() && !isValidMobile(mobile)) {
      newFieldErrors['mobile'] = 'Mobile number must be numbers only (11-12 digits)';
    }
    
    setFieldErrors(newFieldErrors);
    if (Object.keys(newFieldErrors).length > 0) {
      message.error('Please correct the highlighted errors before saving.');
      return;
    }

    // Check for duplicate email/mobile/username before saving
    if (emailTaken || mobileTaken || usernameTaken) {
      message.error('Please fix duplicate email, mobile number, or username before saving.');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      // Prepare payload with only updatable fields
      const payload = {
        username: editedProfile.user?.username,
        firstName: editedProfile.firstName,
        middleName: editedProfile.middleName,
        lastName: editedProfile.lastName,
        suffix: editedProfile.suffix,
        dateOfBirth: editedProfile.dateOfBirth,
        birthPlace: editedProfile.birthPlace,
        sex: editedProfile.sex,
        civilStatus: editedProfile.civilStatus,
        religion: editedProfile.religion,
        ethnicity: editedProfile.ethnicity,
        citizenship: editedProfile.citizenship,
        occupation: editedProfile.occupation,
        sectoralInformation: editedProfile.sectoralInformation,
        employmentStatus: editedProfile.employmentStatus,
        registeredVoter: editedProfile.registeredVoter,
        address: {
          purok: editedProfile.address?.purok,
          barangay: editedProfile.address?.barangay,
          municipality: editedProfile.address?.municipality,
          province: editedProfile.address?.province,
          zipCode: editedProfile.address?.zipCode
        },
        contact: {
          mobile: editedProfile.contact?.mobile || '',
          email: editedProfile.contact?.email || ''
        }
      };
      
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/resident/profile`,
        payload,
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
      console.error('Error response:', error.response?.data);
      
      // Check if error is about duplicate email, mobile, or username
      const errorMessage = error.response?.data?.message || '';
      if (errorMessage.includes('Email is already registered')) {
        setEmailTaken(true);
      }
      if (errorMessage.includes('Mobile number is already registered')) {
        setMobileTaken(true);
      }
      if (errorMessage.includes('Username already exists') || errorMessage.includes('Username is already taken')) {
        setUsernameTaken(true);
      }
      
      // Show validation errors if available
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        error.response.data.errors.forEach(err => message.error(err));
      } else {
        message.error(error.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Real-time validation
    const newFieldErrors = { ...fieldErrors };
    
    // Validate name fields (firstName, lastName, middleName)
    if (['firstName', 'lastName'].includes(field)) {
      if (!value || value.trim() === '') {
        newFieldErrors[field] = `${field === 'firstName' ? 'First Name' : 'Last Name'} is required`;
      } else if (!isAlphaOnly(value)) {
        newFieldErrors[field] = `${field === 'firstName' ? 'First Name' : 'Last Name'} may contain letters, spaces, and hyphens (-) only`;
      } else {
        delete newFieldErrors[field];
      }
    } else if (field === 'middleName') {
      if (value && !isAlphaOnly(value)) {
        newFieldErrors[field] = 'Middle Name may contain letters, spaces, and hyphens (-) only';
      } else {
        delete newFieldErrors[field];
      }
    }
    
    // Validate religion and ethnicity (optional but must be alphabetic if provided)
    if (['religion', 'ethnicity'].includes(field)) {
      if (value && !isAlphaOnly(value)) {
        newFieldErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} may contain letters, spaces, and hyphens (-) only`;
      } else {
        delete newFieldErrors[field];
      }
    }
    
    setFieldErrors(newFieldErrors);
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

  const handleUserChange = (field, value) => {
    setEditedProfile(prev => ({
      ...prev,
      user: {
        ...prev.user,
        [field]: value
      }
    }));

    // Real-time validation for username
    if (field === 'username') {
      const newFieldErrors = { ...fieldErrors };
      
      if (!value || value.trim() === '') {
        newFieldErrors['username'] = 'Username is required';
      } else if (value.length < 6) {
        newFieldErrors['username'] = 'Username must be at least 6 characters';
      } else if (!isValidUsername(value)) {
        newFieldErrors['username'] = 'Username may contain letters, numbers, . _ - only';
      } else {
        delete newFieldErrors['username'];
      }
      
      setFieldErrors(newFieldErrors);
      
      // Check for duplicate username
      if (value && value.trim()) {
        const duplicate = allUsers.find(u => 
          u._id !== profile.user?._id && 
          u.username?.toLowerCase() === value.trim().toLowerCase()
        );
        setUsernameTaken(!!duplicate);
        if (duplicate) {
          message.warning('This username is already taken.');
        }
      } else {
        setUsernameTaken(false);
      }
    }
  };

  const handleContactChange = (field, value) => {
    setEditedProfile(prev => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: value
      }
    }));

    // Check for duplicates when contact fields change
    if (field === 'email' && value && value.trim()) {
      const duplicate = allResidents.find(r => 
        r._id !== profile._id && 
        r.contact?.email?.toLowerCase() === value.trim().toLowerCase()
      );
      setEmailTaken(!!duplicate);
      if (duplicate) {
        message.warning('This email is already registered to another resident.');
      }
    } else if (field === 'email') {
      setEmailTaken(false);
    }

    if (field === 'mobile' && value && value.trim()) {
      const duplicate = allResidents.find(r => 
        r._id !== profile._id && 
        r.contact?.mobile === value.trim()
      );
      setMobileTaken(!!duplicate);
      if (duplicate) {
        message.warning('This mobile number is already registered to another resident.');
      }
    } else if (field === 'mobile') {
      setMobileTaken(false);
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
    return address.purok || 'N/A';
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
        <main className="mx-auto w-full max-w-9xl space-y-3 px-2 py-3 sm:space-y-8 sm:px-4 sm:py-6 lg:px-8">
          <div className="flex justify-center items-center min-h-[200px] sm:min-h-[400px]">
            <Spin size="small" className="sm:size-large" />
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        <ResidentNavbar />
        <main className="mx-auto w-full max-w-9xl space-y-3 px-2 py-3 sm:space-y-8 sm:px-4 sm:py-6 lg:px-8">
          <Card className="w-full">
            <CardContent className="text-center py-6 sm:py-12">
              <Title level={3} className="text-sm sm:text-2xl">Profile not found</Title>
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
              <div className="flex sm:flex-row flex-col gap-2 sm:items-center items-stretch w-full sm:w-auto">
                {!isEditing ? (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={handleEdit}
                    size={isMobile ? 'small' : 'large'}
                    className={isMobile ? 'text-base px-4 h-10 min-w-[120px] w-full' : 'text-base px-6 h-10 min-w-[120px]'}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex sm:flex-row flex-col gap-2 w-full sm:w-auto">
                    <Button
                      icon={<CloseOutlined />}
                      onClick={handleCancel}
                      size={isMobile ? 'small' : 'large'}
                      disabled={saving}
                      className={isMobile ? 'text-base px-4 h-10 min-w-[120px] w-full' : 'text-base px-6 h-10 min-w-[120px]'}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSave}
                      size={isMobile ? 'small' : 'large'}
                      loading={saving}
                      className={isMobile ? 'text-base px-4 h-10 min-w-[120px] w-full' : 'text-base px-6 h-10 min-w-[120px]'}
                    >
                      Save Changes
                    </Button>
                  </div>
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
                  {profile.firstName || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Middle Name">
                  {profile.middleName || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Last Name">
                  {profile.lastName || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Suffix">
                  {profile.suffix || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Date of Birth">
                  {formatDate(profile.dateOfBirth)}
                </Descriptions.Item>
                <Descriptions.Item label="Birth Place">
                  {profile.birthPlace || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Gender">
                  {profile.sex ? profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1) : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Civil Status">
                  {profile.civilStatus ? profile.civilStatus.charAt(0).toUpperCase() + profile.civilStatus.slice(1) : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Religion">
                  {profile.religion || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Ethnicity">
                  {profile.ethnicity || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Citizenship">
                  {profile.citizenship || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Occupation">
                  {profile.occupation || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Sectoral Information">
                  {profile.sectoralInformation || 'None'}
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
                  {profile.address?.purok || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Barangay">
                  {profile.address?.barangay || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Municipality">
                  {profile.address?.municipality || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Province">
                  {profile.address?.province || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="ZIP Code">
                  {profile.address?.zipCode || 'N/A'}
                </Descriptions.Item>
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
              {(emailTaken || mobileTaken) && (
                <div className="mb-4 space-y-2">
                  {emailTaken && (
                    <Alert
                      message="Email already registered"
                      description="This email is already used by another resident. Please use a different email."
                      type="error"
                      showIcon
                      closable
                      onClose={() => setEmailTaken(false)}
                    />
                  )}
                  {mobileTaken && (
                    <Alert
                      message="Mobile number already registered"
                      description="This mobile number is already used by another resident. Please use a different number."
                      type="error"
                      showIcon
                      closable
                      onClose={() => setMobileTaken(false)}
                    />
                  )}
                </div>
              )}
              <Descriptions column={1} size="middle" bordered>
                <Descriptions.Item label="Mobile Number">
                  {isEditing ? (
                    <div>
                      <Input 
                        value={editedProfile?.contact?.mobile} 
                        onChange={(e) => {
                          const mobile = e.target.value;
                          
                          // Only allow numbers
                          if (mobile && !/^\d*$/.test(mobile)) {
                            return; // Don't update if non-numeric
                          }
                          
                          handleContactChange('mobile', mobile);
                          
                          // Clear error if empty (optional field)
                          if (!mobile || !mobile.trim()) {
                            setMobileTaken(false);
                            setFieldErrors(prev => ({ ...prev, mobile: undefined }));
                            return;
                          }
                          
                          // Validate mobile format (11-12 digits)
                          if (mobile.length < 11) {
                            setFieldErrors(prev => ({ ...prev, mobile: 'Minimum 11 digits' }));
                            setMobileTaken(false);
                            return;
                          } else if (mobile.length > 12) {
                            setFieldErrors(prev => ({ ...prev, mobile: 'Maximum 12 digits' }));
                            setMobileTaken(false);
                            return;
                          } else {
                            setFieldErrors(prev => ({ ...prev, mobile: undefined }));
                          }
                          
                          // Check for duplicates
                          const exists = allResidents.some(r => 
                            r.contact?.mobile === mobile.trim() &&
                            r._id !== profile._id
                          );
                          setMobileTaken(exists);
                        }}
                        placeholder="e.g., 09123456789"
                        status={mobileTaken || fieldErrors.mobile ? 'error' : ''}
                        maxLength={12}
                      />
                      {fieldErrors.mobile && (
                        <div className="text-red-500 text-xs mt-1">{fieldErrors.mobile}</div>
                      )}
                    </div>
                  ) : (profile.contact?.mobile || 'N/A')}
                </Descriptions.Item>
                <Descriptions.Item label="Email Address">
                  {isEditing ? (
                    <div>
                      <Input 
                        value={editedProfile?.contact?.email} 
                        onChange={(e) => {
                          const email = e.target.value;
                          handleContactChange('email', email);
                          
                          // Clear error if empty (optional field)
                          if (!email || !email.trim()) {
                            setEmailTaken(false);
                            setFieldErrors(prev => ({ ...prev, email: undefined }));
                            return;
                          }
                          
                          // Validate email format
                          if (!isValidEmail(email)) {
                            setFieldErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
                            return;
                          } else {
                            setFieldErrors(prev => ({ ...prev, email: undefined }));
                          }
                          
                          // Check for duplicates
                          const normalizedEmail = email.trim().toLowerCase();
                          const exists = allResidents.some(r => 
                            r.contact?.email?.toLowerCase() === normalizedEmail &&
                            r._id !== profile._id
                          );
                          setEmailTaken(exists);
                        }}
                        type="email"
                        placeholder="e.g., email@example.com"
                        status={emailTaken || fieldErrors.email ? 'error' : ''}
                      />
                      {fieldErrors.email && (
                        <div className="text-red-500 text-xs mt-1">{fieldErrors.email}</div>
                      )}
                    </div>
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
              {usernameTaken && (
                <div className="mb-4">
                  <Alert
                    message="Username already taken"
                    description="This username is already used by another user. Please choose a different username."
                    type="error"
                    showIcon
                    closable
                    onClose={() => setUsernameTaken(false)}
                  />
                </div>
              )}
              <Descriptions column={1} size="middle" bordered>
                <Descriptions.Item label="Username">
                  {isEditing ? (
                    <>
                      <Input 
                        value={editedProfile?.user?.username} 
                        onChange={(e) => {
                          const username = e.target.value;
                          handleUserChange('username', username);
                          
                          // Clear errors if empty
                          if (!username || !username.trim()) {
                            setUsernameTaken(false);
                            setFieldErrors(prev => ({ ...prev, username: 'Username is required' }));
                            return;
                          }
                          
                          // Validate username length
                          if (username.length < 6) {
                            setFieldErrors(prev => ({ ...prev, username: 'Username must be at least 6 characters' }));
                            setUsernameTaken(false);
                            return;
                          }
                          
                          // Validate username format
                          if (!isValidUsername(username)) {
                            setFieldErrors(prev => ({ ...prev, username: 'Username may contain letters, numbers, . _ - only' }));
                            setUsernameTaken(false);
                            return;
                          }
                          
                          // Clear format errors
                          setFieldErrors(prev => ({ ...prev, username: undefined }));
                          
                          // Check for duplicates (excluding current user)
                          const exists = allUsers.some(u => 
                            u.username.toLowerCase() === username.toLowerCase() &&
                            u._id !== profile.user?._id
                          );
                          setUsernameTaken(exists);
                        }}
                        placeholder="e.g., juan.cruz (min. 6 characters)"
                        status={usernameTaken || fieldErrors.username ? 'error' : ''}
                      />
                      {fieldErrors.username && (
                        <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>{fieldErrors.username}</div>
                      )}
                    </>
                  ) : (profile.user?.username || 'N/A')}
                </Descriptions.Item>
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