import React, { useState, useEffect } from "react";
import axios from "axios";
import { Form, Input, Button, Alert, message, Drawer, Steps, Select, DatePicker, Upload, Descriptions, Switch } from "antd";

// Sectoral Information options
const SECTORAL_OPTIONS = [
  { value: "Solo Parent", label: "Solo Parent" },
  { value: "OFW", label: "OFW (Overseas Filipino Worker)" },
  { value: "PWD", label: "PWD (Person with Disability)" },
  { value: "OSC - Out of School Children", label: "OSC - Out of School Children" },
  { value: "OSC - Out of School Youth", label: "OSC - Out of School Youth" },
  { value: "OSC - Out of School Adult", label: "OSC - Out of School Adult" },
  { value: "None", label: "None" }
];

// Employment Status options
const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "Unemployed", label: "Unemployed" },
  { value: "Labor Force", label: "Labor Force" }
];

const Login = () => {
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [step, setStep] = useState(1);
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regForm] = Form.useForm();
  const [initializing, setInitializing] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  const stepFieldNames = {
    1: [
      "firstName","middleName","lastName","dateOfBirth","birthPlace","sex","civilStatus","religion","ethnicity"
    ],
    2: [
      ["address","purok"],
      ["address","barangay"],["address","municipality"],["address","province"],["address","zipCode"],
  "citizenship","occupation","sectoralInformation","employmentStatus","registeredVoter",["contact","mobile"],["contact","email"]
    ],
    3: [
      "username",
      "password",
      "confirmPassword"
    ],
    4: [] // No validation needed for confirmation step
  };

  // Prefer Vite env variable; fallback to local backend
  const API_BASE =
    import.meta?.env?.VITE_API_URL || "http://localhost:4000";

  const handleSubmit = async (values) => {
    setError("");
    try {
      // Send the credential as usernameOrEmail to handle both username and email login
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        usernameOrEmail: values.username,
        password: values.password,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      if (res.data.userData) {
        localStorage.setItem("userData", JSON.stringify(res.data.userData));
      }

      // Resident verification check
      if (res.data.role === "resident" && res.data.isVerified === false) {
        setError("Your information is pending admin verification. Please wait for approval before accessing the resident dashboard.");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("userData");
        return;
      }

      // Role-based redirect
      if (res.data.role === "admin") {
        window.location.href = "/admin-dashboard";
      } else if (res.data.role === "official") {
        window.location.href = "/official-dashboard";
      } else if (res.data.role === "resident") {
        window.location.href = "/resident-dashboard";
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      const status = err.response?.status;
      const message =
        status === 503
          ? "Service temporarily unavailable. Please try again later."
          : status >= 500
          ? "Server error. Please try again later."
          : status === 400
          ? "Invalid username/email or password."
          : err.response?.data?.message || "Login failed";
      setError(message);
    }
  };

  const handleNext = async () => {
    try {
      const fields = stepFieldNames[step] || [];
      if (fields.length) {
        await regForm.validateFields(fields); // validate current step only
      }
      setRegError("");
      
      if (step === 4) {
        // If it's the confirmation step, proceed directly to registration
        const values = regForm.getFieldsValue(true);
        await handleRegister(values);
      } else {
        // Otherwise, proceed to next step
        setStep((prev) => prev + 1);
      }
    } catch (err) {
      // Show field errors if any
      if (err && err.errorFields && err.errorFields.length > 0) {
        // Optionally, scroll to first error
        const firstError = err.errorFields[0];
        if (firstError && firstError.name) {
          regForm.scrollToField(firstError.name);
        }
        // Build a readable list of missing fields
        const missing = err.errorFields.map(f => {
          // Try to get the label from the form item meta
          const name = Array.isArray(f.name) ? f.name[f.name.length-1] : f.name;
          // Convert camelCase or snake_case to Title Case
          return name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, s => s.toUpperCase());
        });
        setRegError(`Please fill in the following required field(s): ${missing.join(", ")}`);
      }
      // keep user on the same step
    }
  };

  const handlePrev = () => setStep((prev) => prev - 1);

  // Helper to close and reset the register panel
  const closeRegisterPanel = () => {
    setShowRegister(false);
    setStep(1);
    setRegError("");
    setRegLoading(false);
    setRegEmail("");
    regForm.resetFields();
  };

  // Helper to open the register panel fresh
  const openRegisterPanel = () => {
    setShowRegister(true);
    setStep(1);
    setRegError("");
    setRegEmail("");
    regForm.resetFields();
  };

  // Helper to normalize Upload value for Form
  const normFile = (e) => { // NEW
    if (Array.isArray(e)) return e;
    return e?.fileList || [];
  };

  // Registration directly handled by handleNext at step 3
  
  // Registration submit handler
  const handleRegister = async (formValues) => {
    setRegError("");
    setRegLoading(true);
    message.loading({ content: "Creating your account...", key: "registerLoading" });
    try {
      // Use provided values or read from the form
      const values = formValues || regForm.getFieldsValue(true);

      // Build fullName and normalize
      const fullName = [values.firstName, values.middleName, values.lastName, values.suffix]
        .filter(Boolean)
        .join(" ")
        .trim();

      const email = values?.contact?.email?.trim();
      const password = values?.password;
      const username = values?.username?.trim();

      if (!password || !fullName || !username) {
        setRegError("Username, password, and full name are required");
        return;
      }

      const payload = {
        username,
        password,
        fullName,
        // Name fields needed by Resident
        firstName: values.firstName,
        middleName: values.middleName,
        lastName: values.lastName,
        suffix: values.suffix,
        dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD"),
        birthPlace: values.birthPlace,
        sex: values.sex,
        civilStatus: values.civilStatus,
        religion: values.religion,
        ethnicity: values.ethnicity,
        address: {
          purok: values?.address?.purok,
          barangay: values?.address?.barangay,
          municipality: values?.address?.municipality,
          province: values?.address?.province,
          zipCode: values?.address?.zipCode,
        },
        contact: {
          email,
          mobile: values?.contact?.mobile?.trim(),
        },
        citizenship: values.citizenship,
        occupation: values.occupation,
        sectoralInformation: values.sectoralInformation,
        employmentStatus: values.employmentStatus,
        registeredVoter: values.registeredVoter || false,
        role: "resident",
      };

      console.log('Registration payload:', payload);
      const response = await axios.post(`${API_BASE}/api/auth/register`, payload);
      console.log('Registration response:', response.data);
      message.success({ 
        content: "Registration successful! You can now log in immediately.", 
        key: "registerLoading", 
        duration: 3 
      });
      closeRegisterPanel();
    } catch (err) {
      console.error('Registration error:', err.response?.data || err);
      const status = err.response?.status;
      
      // Get more detailed error message when available
      let errorDetail = '';
      if (err.response?.data?.message) {
        errorDetail = `: ${err.response.data.message}`;
      }
      
      const msg =
        status === 503
          ? "Service temporarily unavailable. Please try again later."
          : status >= 500
          ? "Server error. Please try again later."
          : status === 400
          ? `Registration failed${errorDetail}`
          : "Registration failed";
      setRegError(msg);
      message.error({ content: msg, key: "registerLoading", duration: 3 });
    } finally {
      setRegLoading(false);
    }
  };

  // Verification functions removed

  useEffect(() => {
    setContentVisible(false);
    const startTimer = setTimeout(() => setFadeOut(true), 600);
    const endTimer = setTimeout(() => setInitializing(false), 1100);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(endTimer);
    };
  }, []);

  useEffect(() => {
    if (!initializing) {
      const showTimer = setTimeout(() => setContentVisible(true), 50);
      return () => clearTimeout(showTimer);
    }
  }, [initializing]);

  if (initializing) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center bg-gray-100 transition-opacity duration-500 ${
          fadeOut ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <img
            src="/src/assets/logo.png"
            alt="Barangay Logo"
            className="h-28 w-28 animate-spin"
            style={{ animationDuration: "3s" }}
          />
          <span className="text-gray-600 font-semibold tracking-wide">
            Loading Barangay Portal...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-screen bg-gray-100 relative overflow-hidden transition-opacity duration-500 ${
        contentVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Left Side - Full Image */}
      <div className="hidden md:block relative w-3/5 h-screen">
        <img
          src="/src/assets/bg.jpg"
          alt="Barangay"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-8xl font-poppins font-extrabold text-white drop-shadow-lg mb-4">
            WELCOME TO <br /> LA TORRE NORTH
          </h1>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-poppins font-semibold text-white drop-shadow-md max-w-2xl">
            Blockchain-Based Barangay Information Management System
          </h2>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex w-full md:w-2/5 items-center justify-center relative z-10">
        <div className="w-full max-w-md m-8">
          <div className="flex justify-center mb-6">
            <img
              src="/src/assets/logo.png"
              alt="Logo"
              className="h-30 w-30"
            />
          </div>
          {error && (
            <Alert message={error} type="error" showIcon className="mb-4" />
          )}
          <Form layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="Username or Email"
              name="username"
              rules={[
                { required: true, message: "Please input your username or email!" },
              ]}
            >
              <Input size="large" placeholder="Enter your username or email" />
            </Form.Item>
            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: "Please input your password!" },
              ]}
            >
              <Input.Password size="large" placeholder="Enter your password" />
            </Form.Item>
           <div className="flex flex-col gap-2">
            <button
              type="submit"
              className="cursor-pointer group relative bg-black hover:bg-black text-white font-semibold text-sm px-6 py-3 rounded-full transition-all duration-200 ease-in-out shadow hover:shadow-lg w-full h-12"
            >
              <div className="relative flex items-center justify-center gap-2">
                <span className="relative inline-block overflow-hidden">
                  <span
                    className="text-white block transition-transform duration-300 group-hover:-translate-y-full"
                  >
                    Login Now!
                  </span>
                  <span
                    className="absolute text-white inset-0 transition-transform duration-300 translate-y-full group-hover:translate-y-0"
                  >
                    Right Now
                  </span>
                </span>
              </div>
            </button>

  <button
    type="button"
    onClick={openRegisterPanel}
    className="cursor-pointer group relative bg-white hover:bg-zinc-300 text-black font-semibold text-sm px-6 py-3 rounded-full transition-all duration-200 ease-in-out shadow hover:shadow-lg w-full h-12"
  >
    <div className="relative flex items-center justify-center gap-2">
      <span className="relative inline-block overflow-hidden">
        <span
          className="block transition-transform duration-300 group-hover:-translate-y-full"
        >
          Don't have an account?
        </span>
        <span
          className="absolute inset-0 transition-transform duration-300 translate-y-full group-hover:translate-y-0"
        >
          Register Here!
        </span>
      </span>

      <svg
        className="w-4 h-4 transition-transform duration-200 group-hover:rotate-45"
        viewBox="0 0 24 24"
      >
        <circle fill="currentColor" r="11" cy="12" cx="12"></circle>
        <path
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeWidth="2"
          stroke="white"
          d="M7.5 16.5L16.5 7.5M16.5 7.5H10.5M16.5 7.5V13.5"
        ></path>
      </svg>
    </div>
  </button>
</div>

          </Form>
          <div className="absolute bottom-4 right-4 items-center w-auto">
            <span className="text-xs text-gray-500">
              Powered by Blockchain Technology
            </span>
          </div>
        </div>
      </div>

      {/* Registration Drawer (Ant Design) */}
      <Drawer
        title="Resident Registration"
        placement="right"
        onClose={closeRegisterPanel}
        open={showRegister}
        width={640}
        destroyOnClose={false}
        maskClosable={!regLoading}
        height="100vh"
      >
        {/* Step indicator */}
        <div className="mb-4">
          <Steps
            size="small"
            current={step - 1}
            items={[
              { title: "Personal" },
              { title: "Address" },
              { title: "Account" },
              { title: "Confirm" },
            ]}
          />
        </div>

        <div className="w-full max-w-lg mx-auto">
          {regError && <Alert message={regError} type="error" showIcon className="mb-3" />}

          <Form
            form={regForm}
            layout="vertical"
            preserve={true}
            onFinish={handleRegister}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && step !== 4) e.preventDefault();
            }}
            onValuesChange={(changed, all) => {
              // If the user updates the Address & Contact email, sync it to the Account step
              if (changed?.contact?.email !== undefined) {
                // Only sync if email has a value
                if (changed.contact.email) {
                  regForm.setFieldsValue({ accountEmail: changed.contact.email });
                }
              }
            }}
          >
            {/* STEP 1: Personal Info */}
            {step === 1 && (
              <>
                <h3 className="text-sm font-semibold mb-2">Personal Info</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Form.Item
                    label="First Name"
                    name="firstName"
                    rules={[
                      { required: true, message: 'First name is required' },
                      { pattern: /^[A-Za-z\s-]+$/, message: 'First name may contain letters, spaces, and hyphens (-)' }
                    ]}
                    className="mb-2"
                  >
                    <Input size="middle" placeholder="e.g., Juan-Carlos" />
                  </Form.Item>
                  <Form.Item
                    label="Middle Name"
                    name="middleName"
                    rules={[
                      { pattern: /^[A-Za-z\s-]*$/, message: 'Middle name may contain letters, spaces, and hyphens (-)' }
                    ]}
                    className="mb-2"
                  >
                    <Input size="middle" placeholder="e.g., Santos-De" />
                  </Form.Item>
                  <Form.Item
                    label="Last Name"
                    name="lastName"
                    rules={[
                      { required: true, message: 'Last name is required' },
                      { pattern: /^[A-Za-z\s-]+$/, message: 'Last name may contain letters, spaces, and hyphens (-)' }
                    ]}
                    className="mb-2"
                  >
                    <Input size="middle" placeholder="e.g., Dela-Cruz" />
                  </Form.Item>
                  <Form.Item label="Suffix" name="suffix" className="mb-2">
                    <Input size="middle" placeholder="e.g., Jr., Sr., III" />
                  </Form.Item>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Date of Birth" name="dateOfBirth" rules={[{ required: true, message: 'Please select your date of birth!' }]} className="mb-2">
                    <DatePicker
                      className="w-full"
                      size="middle"
                      disabledDate={current => current && current > new Date()}
                      placeholder="Select date of birth"
                    />
                  </Form.Item>
                  <Form.Item label="Birth Place" name="birthPlace" rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" placeholder="e.g., Bayombong, Nueva Vizcaya" />
                  </Form.Item>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Gender" name="sex" rules={[{ required: true }]} className="mb-2">
                    <Select
                      options={[ 
                        { value: "male", label: "Male" },
                        { value: "female", label: "Female" },
                      ]}
                      size="middle"
                    />
                  </Form.Item>
                  <Form.Item label="Civil Status" name="civilStatus" rules={[{ required: true }]} className="mb-2">
                    <Select
                      options={[ 
                        { value: "single", label: "Single" },
                        { value: "married", label: "Married" },
                        { value: "widowed", label: "Widowed" },
                        { value: "separated", label: "Separated" },
                      ]}
                      size="middle"
                    />
                  </Form.Item>
                </div>
                <Form.Item
                  label="Religion"
                  name="religion"
                  rules={[
                    { required: false },
                    { pattern: /^[A-Za-z\s-]+$/, message: 'Religion may contain letters, spaces, and hyphens (-)' }
                  ]}
                  className="mb-2"
                >
                  <Input size="middle" placeholder="e.g., Roman-Catholic" />
                </Form.Item>
                <Form.Item
                  label="Ethnicity"
                  name="ethnicity"
                  rules={[
                    { required: true, message: 'Ethnicity is required' },
                    { pattern: /^[A-Za-z\s-]+$/, message: 'Ethnicity may contain letters, spaces, and hyphens (-)' }
                  ]}
                  className="mb-2"
                >
                  <Input size="middle" placeholder="e.g., Ilocano, Tagalog, Igorot" />
                </Form.Item>
              </>
            )}

            {/* STEP 2: Address & Contact */}
            {step === 2 && (
              <>
                <h3 className="text-sm font-semibold mb-2">Address</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Purok" name={["address", "purok"]} rules={[{ required: true }]} className="mb-2">
                    <Select
                      options={[
                        { value: "Purok 1", label: "Purok 1" },
                        { value: "Purok 2", label: "Purok 2" },
                        { value: "Purok 3", label: "Purok 3" },
                        { value: "Purok 4", label: "Purok 4" },
                        { value: "Purok 5", label: "Purok 5" },
                      ]}
                      size="middle"
                    />
                  </Form.Item>
                  <Form.Item label="Barangay" name={["address", "barangay"]} initialValue="La Torre North" rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" disabled />
                  </Form.Item>
                  <Form.Item label="Municipality" name={["address", "municipality"]} initialValue="Bayombong" rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" disabled />
                  </Form.Item>
                  <Form.Item label="Province" name={["address", "province"]} initialValue="Nueva Vizcaya" rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" disabled />
                  </Form.Item>
                  <Form.Item label="ZIP Code" name={["address", "zipCode"]} initialValue="3700" className="mb-2">
                    <Input size="middle" disabled />
                  </Form.Item>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Citizenship" name="citizenship" initialValue="Filipino" rules={[{ required: false }]} className="mb-2">
                    <Input size="middle" placeholder="e.g., Filipino" disabled />
                  </Form.Item>
                  <Form.Item label="Occupation" name="occupation" rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" placeholder="e.g., Teacher" />
                  </Form.Item>
                </div>

                <Form.Item label="Sectoral Information" name="sectoralInformation" rules={[{ required: false }]} className="mb-2">
                  <Select
                    size="middle"
                    placeholder="Select sectoral information (optional)"
                    options={SECTORAL_OPTIONS}
                    allowClear
                  />
                </Form.Item>

                <Form.Item label="Employment Status" name="employmentStatus" rules={[{ required: false }]} className="mb-2">
                  <Select
                    size="middle"
                    placeholder="Select employment status (optional)"
                    options={EMPLOYMENT_STATUS_OPTIONS}
                    allowClear
                  />
                </Form.Item>

                <Form.Item label="Registered Voter" name="registeredVoter" rules={[{ required: false }]} className="mb-2" valuePropName="checked">
                  <Switch checkedChildren="Yes" unCheckedChildren="No" />
                </Form.Item>

                <h3 className="text-sm font-semibold mt-4 mb-2">Contact</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Mobile" name={["contact", "mobile"]} rules={[{ type: "string", required: false }]} className="mb-2">
                    <Input size="middle" placeholder="e.g., 09123456789" />
                  </Form.Item>
                  <Form.Item label="Email" name={["contact", "email"]} rules={[{ type: "email", required: false }]} className="mb-2">
                    <Input size="middle" placeholder="e.g., juan.delacruz@email.com" />
                  </Form.Item>
                </div>

                <Form.Item
                  label="Upload Valid ID"
                  name="idFiles"
                  valuePropName="fileList"
                  getValueFromEvent={normFile}
                  className="mb-2"
                  rules={[{ required: true, message: 'Please upload a valid ID image.' }]}
                >
                  <Upload.Dragger
                    multiple
                    accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                    beforeUpload={file => {
                      const isImage = file.type.startsWith('image/');
                      if (!isImage) {
                        message.error('You can only upload image files!');
                      }
                      return false; // Prevent upload
                    }}
                  >
                    <p className="ant-upload-drag-icon">+</p>
                    <p className="ant-upload-text">Click or drag image files to this area to upload</p>
                    <p className="ant-upload-hint">Only for verification; not sent to backend yet. (JPG, PNG, GIF, WEBP)</p>
                  </Upload.Dragger>
                </Form.Item>
              </>
            )}

            {/* STEP 3: Account */}
            {step === 3 && (
              <>
                <h3 className="text-sm font-semibold mb-2">Account</h3>
                <div className="grid grid-cols-1 gap-2">
                  <Form.Item label="Email" name="accountEmail" className="mb-2">
                    <Input size="middle" disabled placeholder="(auto-filled from Address & Contact)" />
                  </Form.Item>

                  {/* NEW: Username */}
                  <Form.Item
                    label="Username"
                    name="username"
                    rules={[
                      { required: true, message: "Username is required" },
                      { min: 3, message: "At least 3 characters" },
                      { pattern: /^[a-zA-Z0-9._-]+$/, message: "Use letters, numbers, . _ -" },
                    ]}
                    className="mb-2"
                  >
                    <Input size="middle" autoComplete="off" placeholder="e.g., juan.delacruz" />
                  </Form.Item>

                  <Form.Item label="Password" name="password" rules={[{ required: true, min: 6 }]} className="mb-2">
                    <Input.Password size="middle" placeholder="At least 6 characters" />
                  </Form.Item>
                  <Form.Item
                    label="Confirm Password"
                    name="confirmPassword"
                    dependencies={["password"]}
                    rules={[
                      { required: true },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("password") === value) return Promise.resolve();
                          return Promise.reject(new Error("Passwords do not match"));
                        },
                      }),
                    ]}
                    className="mb-2"
                  >
                    <Input.Password size="middle" placeholder="Repeat your password" />
                  </Form.Item>
                </div>
              </>
            )}

            {/* STEP 4: Confirmation */}
            {step === 4 && (
              <>
                <h3 className="text-sm font-semibold mb-4">Please Review Your Information</h3>
                
                <div className="max-h-[70vh] overflow-y-auto">
                  <Alert
                    message="Please verify all information is correct before submitting"
                    description="You can go back to edit any incorrect information by clicking 'Previous'."
                    type="info"
                    showIcon
                    className="mb-4"
                  />
                  
                  <Descriptions title="Personal Information" bordered column={2} className="mb-4" size="middle">
                    <Descriptions.Item label="First Name" span={1}>{regForm.getFieldValue('firstName')}</Descriptions.Item>
                    <Descriptions.Item label="Middle Name" span={1}>{regForm.getFieldValue('middleName') || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Last Name" span={1}>{regForm.getFieldValue('lastName')}</Descriptions.Item>
                    <Descriptions.Item label="Suffix" span={1}>{regForm.getFieldValue('suffix') || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Date of Birth" span={1}>{regForm.getFieldValue('dateOfBirth')?.format?.('MMMM D, YYYY') || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Birth Place" span={1}>{regForm.getFieldValue('birthPlace')}</Descriptions.Item>
                    <Descriptions.Item label="Gender" span={1}>{regForm.getFieldValue('gender')}</Descriptions.Item>
                    <Descriptions.Item label="Civil Status" span={1}>{regForm.getFieldValue('civilStatus')}</Descriptions.Item>
                    <Descriptions.Item label="Religion" span={1}>{regForm.getFieldValue('religion')}</Descriptions.Item>
                    <Descriptions.Item label="Ethnicity" span={1}>{regForm.getFieldValue('ethnicity')}</Descriptions.Item>
                  </Descriptions>
                  
                  <Descriptions title="Address Information" bordered column={2} className="mb-4" size="middle">
                    <Descriptions.Item label="Purok" span={2}>{regForm.getFieldValue(['address', 'purok'])}</Descriptions.Item>
                    <Descriptions.Item label="Barangay" span={2}>{regForm.getFieldValue(['address', 'barangay'])}</Descriptions.Item>
                    <Descriptions.Item label="Municipality" span={2}>{regForm.getFieldValue(['address', 'municipality'])}</Descriptions.Item>
                    <Descriptions.Item label="Province" span={2}>{regForm.getFieldValue(['address', 'province'])}</Descriptions.Item>
                    <Descriptions.Item label="ZIP Code" span={2}>{regForm.getFieldValue(['address', 'zipCode'])}</Descriptions.Item>
                  </Descriptions>
                  
                  <Descriptions title="Other Information" bordered column={2} className="mb-4" size="middle">
                    <Descriptions.Item label="Citizenship" span={1}>{regForm.getFieldValue('citizenship')}</Descriptions.Item>
                    <Descriptions.Item label="Occupation" span={1}>{regForm.getFieldValue('occupation')}</Descriptions.Item>
                    <Descriptions.Item label="Sectoral Information" span={2}>{regForm.getFieldValue('sectoralInformation') || 'None'}</Descriptions.Item>
                    <Descriptions.Item label="Employment Status" span={2}>{regForm.getFieldValue('employmentStatus') || 'Not specified'}</Descriptions.Item>
                    <Descriptions.Item label="Registered Voter" span={2}>{regForm.getFieldValue('registeredVoter') ? 'Yes' : 'No'}</Descriptions.Item>
                    {/* ...existing code... */}
                    <Descriptions.Item label="Mobile" span={2}>{regForm.getFieldValue(['contact', 'mobile'])}</Descriptions.Item>
                    <Descriptions.Item label="Email" span={2}>{regForm.getFieldValue(['contact', 'email'])}</Descriptions.Item>
                    <Descriptions.Item label="Username" span={2}>{regForm.getFieldValue('username')}</Descriptions.Item>
                  </Descriptions>
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="mt-4 flex gap-2">
              {step > 1 && (
                <button
                  onClick={handlePrev}
                  className="cssbuttons-io-button-left flex-1 w-full"
                >
                  Previous
                  <div className="icon">
                    <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 0h24v24H0z" fill="none"></path>
                      <path
                        d="M7.828 11l5.364-5.364-1.414-1.414L4 12l7.778 7.778 1.414-1.414L7.828 13H20v-2z"
                        fill="currentColor"
                      ></path>
                    </svg>
                  </div>
                </button>
              )}
              {step < 4 && step !== 3 && (
                <button type="button" onClick={handleNext} className="cssbuttons-io-button flex-1 w-full">
                  Next
                  <div className="icon">
                    <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 0h24v24H0z" fill="none"></path>
                      <path
                        d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z"
                        fill="currentColor"
                      ></path>
                    </svg>
                  </div>
                </button>
              )}
              {step === 3 && (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={regLoading}
                  className="cssbuttons-io-button flex-1 w-full"
                  style={{ backgroundColor: "#0f172a" }}
                >
                  Continue to Review
                  <div className="icon">
                    <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 0h24v24H0z" fill="none"></path>
                      <path
                        d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z"
                        fill="currentColor"
                      ></path>
                    </svg>
                  </div>
                </button>
              )}
              {step === 4 && (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={regLoading}
                  className="cssbuttons-io-button flex-1 w-full"
                  style={{ backgroundColor: "#0f172a" }}
                >
                  Submit Registration
                  <div className="icon">
                    {regLoading ? (
                      <span className="loading-spinner"></span>
                    ) : (
                      <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0h24v24H0z" fill="none"></path>
                        <path
                          d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"
                          fill="currentColor"
                        ></path>
                      </svg>
                    )}
                  </div>
                </button>
              )}
            </div>
          </Form>
        </div>
      </Drawer>


    </div>
  );
};

export default Login;
