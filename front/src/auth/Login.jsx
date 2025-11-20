import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Form, Input, Button, Alert, message, Drawer, Steps, Select, DatePicker, Upload, Descriptions, Switch, Modal } from "antd";
import logo from "../assets/logo.png";
import bg from "../assets/bg.jpg";

// Sectoral Information options
const SECTORAL_OPTIONS = [
  { value: "Solo Parent", label: "Solo Parent" },
  { value: "OFW (Overseas Filipino Worker)", label: "OFW (Overseas Filipino Worker)" },
  { value: "PWD (Person with Disability)", label: "PWD (Person with Disability)" },
  { value: "OSC (Out of School Children)", label: "OSC (Out of School Children)" },
  { value: "OSY (Out of School Youth)", label: "OSY (Out of School Youth)" },
  { value: "OSA (Out of School Adult)", label: "OSA (Out of School Adult)" },
  { value: "None", label: "None" }
];

// Employment Status options
const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "Unemployed", label: "Unemployed" },
  { value: "Labor Force", label: "Labor Force" }
];

const Login = () => {
  const [showRegister, setShowRegister] = useState(false);
  const [step, setStep] = useState(1);
  const [regLoading, setRegLoading] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regForm] = Form.useForm();
  const [loginForm] = Form.useForm();
  const [initializing, setInitializing] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [pendingAlert, setPendingAlert] = useState(false); // Add state for pending alert
  const [loginError, setLoginError] = useState(""); // Add state for login error
  const [forgotVisible, setForgotVisible] = useState(false);
  const [otpPhase, setOtpPhase] = useState(1); // 1=request,2=verify
  const [otpLoading, setOtpLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [notFoundVisible, setNotFoundVisible] = useState(false);
  const [notFoundEntering, setNotFoundEntering] = useState(false);
  const [notFoundLeaving, setNotFoundLeaving] = useState(false);
  const notFoundTimerRef = useRef(null);
  // OTP resend cooldown state (persisted via localStorage)
  const [otpCooldownUntil, setOtpCooldownUntil] = useState(0);
  const [otpCooldownRemaining, setOtpCooldownRemaining] = useState(0);
  const otpCooldownIntervalRef = useRef(null);

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
    try {
      setPendingAlert(false); // Reset alert
      setLoginError(""); // Clear any previous login errors
      
      // Send the credential as usernameOrEmail to handle both username and email login
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        usernameOrEmail: values.username,
        password: values.password,
      });
      
      
      // Resident and Official verification check - do this BEFORE storing tokens
      if ((res.data.role === "resident" || res.data.role === "official") && res.data.isVerified === false) {
        setPendingAlert(true); // Show the alert
        const dashboardType = res.data.role === "official" ? "official dashboard" : "resident dashboard";
        message.error({
          content: `Your account is pending admin verification. Please wait for approval before accessing the ${dashboardType}.`,
          duration: 10,
        });
        return; 
      }

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      if (res.data.userData) {
        localStorage.setItem("userData", JSON.stringify(res.data.userData));
      }

      // Role-based redirect
      if (res.data.role === "admin") {
        window.location.href = "/admin-dashboard";
      } else if (res.data.role === "official" || res.data.role === "resident") {
        window.location.href = "/resident-dashboard";
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      const status = err.response?.status;
      const msg =
        status === 503
          ? "Service temporarily unavailable. Please try again later."
          : status >= 500
          ? "Server error. Please try again later."
          : status === 400
          ? "Invalid username or password."
          : err.response?.data?.message || "Login failed";
      
      // Set the error message to display below fields
      setLoginError(msg);
      message.error(msg);
    }
  };

  const handleNext = async () => {
    try {
      const fields = stepFieldNames[step] || [];
      if (fields.length) {
        await regForm.validateFields(fields); // validate current step only
      }
      
      if (step === 4) {
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
      }
      // keep user on the same step
    }
  };

  const handlePrev = () => setStep((prev) => prev - 1);

  // Helper to close and reset the register panel
  const closeRegisterPanel = () => {
    setShowRegister(false);
    setStep(1);
    setRegLoading(false);
    setRegEmail("");
    regForm.resetFields();
  };

  // Helper to open the register panel fresh
  const openRegisterPanel = () => {
    setShowRegister(true);
    setStep(1);
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

      // do not log payloads in production
      const response = await axios.post(`${API_BASE}/api/auth/register`, payload);
      // do not log responses in production
      message.success({ 
        content: "Registration successful! You can now log in immediately.", 
        key: "registerLoading", 
        duration: 3 
      });
      closeRegisterPanel();
    } catch (err) {
      // suppress verbose error logging in production
      const status = err.response?.status;
      
      // Get more detailed error message when available
      let errorDetail = '';
      if (err.response?.data?.message) {
        errorDetail = err.response.data.message;
      }
      
      const msg =
        status === 503
          ? "Service temporarily unavailable. Please try again later."
          : status >= 500
          ? "Server error. Please try again later."
          : errorDetail || "An error occurred. Please try again.";
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

  // Initialize OTP cooldown from localStorage when Forgot Password opens
  useEffect(() => {
    if (!forgotVisible) return;
    const stored = parseInt(localStorage.getItem('passwordOtpCooldownUntil') || '0', 10);
    if (Number.isFinite(stored) && stored > Date.now()) {
      const startCooldown = (target) => {
        setOtpCooldownUntil(target);
        const tick = () => {
          const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
          setOtpCooldownRemaining(remaining);
          if (remaining <= 0) {
            if (otpCooldownIntervalRef.current) {
              clearInterval(otpCooldownIntervalRef.current);
              otpCooldownIntervalRef.current = null;
            }
            localStorage.removeItem('passwordOtpCooldownUntil');
            setOtpCooldownUntil(0);
          }
        };
        tick();
        if (otpCooldownIntervalRef.current) clearInterval(otpCooldownIntervalRef.current);
        otpCooldownIntervalRef.current = setInterval(tick, 1000);
      };
      startCooldown(stored);
    } else {
      // clear stale
      localStorage.removeItem('passwordOtpCooldownUntil');
      setOtpCooldownUntil(0);
      setOtpCooldownRemaining(0);
    }
    return () => {
      if (otpCooldownIntervalRef.current) {
        clearInterval(otpCooldownIntervalRef.current);
        otpCooldownIntervalRef.current = null;
      }
    };
  }, [forgotVisible]);

  if (initializing) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center bg-gray-100 transition-opacity duration-500 ${
          fadeOut ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <img
            src={logo}
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
          src={bg}
          alt="Barangay"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
        
      </div>

      {/* Right Side - Login Form */}
      <div className="flex w-full md:w-2/5 items-center justify-center relative z-10">
        <div className="w-full max-w-md m-8">
          <div className="flex justify-center mb-6">
            <img
              src={logo}
              alt="Logo"
              className="h-30 w-30"
            />
          </div>
          
          {/* Pending Verification Alert */}
          {pendingAlert && (
            <Alert
              message="Account Pending Verification"
              description="Your account is pending admin verification. Please wait for approval before accessing your dashboard."
              type="error"
              showIcon
              closable
              onClose={() => setPendingAlert(false)}
              className="mb-4"
            />
          )}
          
          <Form 
            form={loginForm}
            layout="vertical" 
            onFinish={handleSubmit}
            onFieldsChange={() => setLoginError("")}
          >
            <Form.Item
              label="Username"
              name="username"
              rules={[
                { required: true, message: "Please input your username!" },
              ]}
              validateStatus={loginError ? "error" : ""}
            >
              <Input size="large" placeholder="Enter your username" />
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
            <div className="flex justify-end mb-4 -mt-2">
              <button
                type="button"
                onClick={() => {
                  setForgotVisible(true);
                  setOtpPhase(1);
                  setIdentifier("");
                  setOtpCode("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                }}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                Forgot password?
              </button>
            </div>
           <div className="flex flex-col gap-2">
                        {/* Show login error below the form if present and not a field validation error */}
                        {loginError && (
                          <div style={{ color: 'red', marginBottom: 12, marginTop: -8, fontSize: 14 }}>
                            {loginError}
                          </div>
                        )}
            <button
              type="submit"
              className="cursor-pointer group relative bg-black hover:bg-black text-white font-semibold text-sm px-6 py-3 rounded-full transition-all duration-200 ease-in-out shadow hover:shadow-lg w-full h-12"
            >
              <span
                    className="text-white block "
                  >
                    Login Now!
                  </span>
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
                <Alert
                  message={<span className="font-semibold text-sm">Welcome to Resident Registration</span>}
                  description={
                    <div className="text-sm leading-relaxed">
                      <p className="mb-3 text-gray-700">Please provide accurate personal information for your barangay registration.</p>
                      <p className="font-semibold mb-2 text-gray-800">Registration Guidelines:</p>
                      <ul className="list-disc list-inside space-y-1.5 text-gray-700">
                        <li>All fields marked with <span className="text-red-500 font-semibold">*</span> are required</li>
                        <li>Double-check your information before proceeding</li>
                      </ul>
                    </div>
                  }
                  type="info"
                  showIcon
                  className="mb-4"
                />
                <div style={{ marginBottom: 16 }} />
                <h3 className="text-base font-semibold mb-3 text-gray-800">Personal Information</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Form.Item
                    label="First Name"
                    name="firstName"
                    rules={[
                      { required: true, message: 'Please enter your first name' },
                      { pattern: /^[A-Za-z\s-]+$/, message: 'First Name may contain letters, spaces, and hyphens (-)' }
                    ]}
                    className="mb-2"
                  >
                    <Input size="middle" placeholder="e.g., JUAN" />
                  </Form.Item>
                  <Form.Item
                    label="Middle Name"
                    name="middleName"
                    rules={[
                      { pattern: /^[A-Za-z\s-]*$/, message: 'Middle name may contain letters, spaces, and hyphens (-)' }
                    ]}
                    className="mb-2"
                  >
                    <Input size="middle" placeholder="e.g., DELA" />
                  </Form.Item>
                  <Form.Item
                    label="Last Name"
                    name="lastName"
                    rules={[
                      { required: true, message: 'Please enter your last name' },
                      { pattern: /^[A-Za-z\s-]+$/, message: 'Last Name may contain letters, spaces, and hyphens (-)' }
                    ]}
                    className="mb-2"
                  >
                    <Input size="middle" placeholder="e.g., CRUZ" />
                  </Form.Item>
                  <Form.Item label="Suffix" name="suffix" className="mb-2">
                    <Input size="middle" placeholder="e.g., Jr., Sr., III" />
                  </Form.Item>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Date of Birth" name="dateOfBirth" rules={[{ required: true, message: 'Please select your date of birth' }]} className="mb-2">
                    <DatePicker
                      className="w-full"
                      size="middle"
                      disabledDate={current => current && current > new Date()}
                      placeholder="Select date of birth"
                    />
                  </Form.Item>
                  <Form.Item label="Birth Place" name="birthPlace" rules={[{ required: true, message: 'Please enter your birth place' }]} className="mb-2">
                    <Input size="middle" placeholder="e.g., BAYOMBONG, NUEVA VIZCAYA" />
                  </Form.Item>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Sex" name="sex" rules={[{ required: true, message: 'Please select your sex' }]} className="mb-2">
                    <Select
                      placeholder="Select sex"
                      options={[ 
                        { value: "male", label: "Male" },
                        { value: "female", label: "Female" },
                      ]}
                      size="middle"
                    />
                  </Form.Item>
                  <Form.Item label="Civil Status" name="civilStatus" rules={[{ required: true, message: 'Please select your civil status' }]} className="mb-3">
                    <Select
                      placeholder="Select civil status"
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
                  className="mb-3"
                >
                  <Input size="middle" placeholder="e.g., ROMAN CATHOLIC" />
                </Form.Item>
                <Form.Item
                  label="Ethnicity"
                  name="ethnicity"
                  rules={[
                    { required: false },
                    { pattern: /^[A-Za-z\s-]+$/, message: 'Ethnicity may contain letters, spaces, and hyphens (-)' }
                  ]}
                  className="mb-3"
                >
                  <Input size="middle" placeholder="e.g., ILOCANO, TAGALOG, IGOROT" />
                </Form.Item>
              </>
            )}

            {/* STEP 2: Address & Contact */}
            {step === 2 && (
              <>
                <h3 className="text-sm font-semibold mb-2">Address</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Purok" name={["address", "purok"]} rules={[{ required: true, message: 'Please select your purok' }]} className="mb-2">
                    <Select
                      placeholder="Select purok"
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
                  <Form.Item label="Barangay" name={["address", "barangay"]} initialValue="La Torre North" rules={[{ required: false }]} className="mb-2">
                    <Input size="middle" placeholder="La Torre North" disabled />
                  </Form.Item>
                  <Form.Item label="Municipality" name={["address", "municipality"]} initialValue="Bayombong" rules={[{ required: false }]} className="mb-2">
                    <Input size="middle" placeholder="Bayombong" disabled />
                  </Form.Item>
                  <Form.Item label="Province" name={["address", "province"]} initialValue="Nueva Vizcaya" rules={[{ required: false }]} className="mb-2">
                    <Input size="middle" placeholder="Nueva Vizcaya" disabled />
                  </Form.Item>
                  <Form.Item label="ZIP Code" name={["address", "zipCode"]} initialValue="3700" className="mb-2">
                    <Input size="middle" placeholder="3700" disabled />
                  </Form.Item>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Citizenship" name="citizenship" initialValue="Filipino" rules={[{ required: false }]} className="mb-2">
                    <Input size="middle" placeholder="e.g., FILIPINO" disabled />
                  </Form.Item>
                  <Form.Item label="Occupation" name="occupation" rules={[{ required: true, message: 'Please enter your occupation' }]} className="mb-2">
                    <Input size="middle" placeholder="e.g., TEACHER, ENGINEER, FARMER" />
                  </Form.Item>
                </div>

                <Form.Item label="Sectoral Information" name="sectoralInformation" rules={[{ required: false }]} className="mb-2">
                  <Select
                    size="middle"
                    placeholder="Select sectoral information"
                    options={SECTORAL_OPTIONS}
                    allowClear
                  />
                </Form.Item>

                <Form.Item label="Employment Status" name="employmentStatus" rules={[{ required: false }]} className="mb-2">
                  <Select
                    size="middle"
                    placeholder="Select employment status"
                    options={EMPLOYMENT_STATUS_OPTIONS}
                    allowClear
                  />
                </Form.Item>

                <Form.Item label="Are you a registered voter?" name="registeredVoter" rules={[{ required: false }]} className="mb-2" valuePropName="checked">
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
                  rules={[{ required: false, message: 'Please upload a valid ID image.' }]}
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
                <Alert
                  message={<span className="font-semibold text-sm">Create Your Account Credentials</span>}
                  description={
                    <div className="text-sm leading-relaxed">
                      <p className="mb-3 text-gray-700">Set up your login credentials to access the barangay system.</p>
                      <p className="font-semibold mb-2 text-gray-800">Account Security Guidelines:</p>
                      <ul className="list-disc list-inside space-y-1.5 text-gray-700">
                        <li>Choose a unique username (minimum 6 characters)</li>
                        <li>Create a strong password (minimum 6 characters)</li>
                        <li>Keep your credentials secure and confidential</li>
                        <li>Your password must match in both fields</li>
                      </ul>
                    </div>
                  }
                  type="info"
                  showIcon
                  className="mb-4"
                />
                <div style={{ marginBottom: 16 }} />
                <h3 className="text-sm font-semibold mb-2">Account</h3>
                <div className="grid grid-cols-1 gap-2">

                  {/* NEW: Username */}
                  <Form.Item
                    label="Username"
                    name="username"
                    rules={[
                      { required: true, message: "Username is required" },
                      { min: 6, message: "Username must be at least 6 characters" },
                      { pattern: /^[a-zA-Z0-9._-]+$/, message: "Use letters, numbers, . _ -" },
                    ]}
                    className="mb-2"
                  >
                    <Input size="middle" autoComplete="off" placeholder="e.g., juan.cruz" />
                  </Form.Item>

                  <Form.Item label="Password" name="password" rules={[{ required: true, min: 6, message: "Password must be at least 6 characters" }]} className="mb-2">
                    <Input.Password size="middle" placeholder="At least 6 characters" />
                  </Form.Item>
                  <Form.Item
                    label="Confirm Password"
                    name="confirmPassword"
                    dependencies={["password"]}
                    rules={[
                      { required: true, message: "Please confirm your password" },
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
                    <Descriptions.Item label="Sex" span={1}>{regForm.getFieldValue('sex')}</Descriptions.Item>
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

      {/* Forgot Password Modal */}
      <Modal
        open={forgotVisible}
        title={otpPhase === 1 ? 'Forgot Password' : 'Reset Password'}
        footer={null}
        onCancel={() => {
          setForgotVisible(false);
          setNotFoundVisible(false);
          setNotFoundEntering(false);
          setNotFoundLeaving(false);
          if (notFoundTimerRef.current) {
            clearTimeout(notFoundTimerRef.current.enterTimer);
            clearTimeout(notFoundTimerRef.current.fadeTimer);
            clearTimeout(notFoundTimerRef.current.unmountTimer);
          }
          if (otpCooldownIntervalRef.current) {
            clearInterval(otpCooldownIntervalRef.current);
            otpCooldownIntervalRef.current = null;
          }
        }}
        destroyOnClose
      >
        {/* Sliding not-found card */}
        {notFoundVisible && (
          <div
            className={`fixed left-1/2 -translate-x-1/2 top-6 z-[2000] transition-all duration-300 ease-out ${
              notFoundEntering
                ? "-translate-y-4 opacity-0"
                : notFoundLeaving
                ? "-translate-y-4 opacity-0"
                : "translate-y-0 opacity-100"
            }`}
          >
            <div className="bg-white border rounded-md shadow-xl px-4 py-3">
              <div className="text-red-600 font-semibold">User not found</div>
              <div className="text-gray-600 text-sm">Please register to create an account.</div>
            </div>
          </div>
        )}
        {otpPhase === 1 && (
          <Form
            layout="vertical"
            onFinish={async () => {
              if (!identifier.trim()) {
                return message.error('Please enter your username or full name');
              }
              setOtpLoading(true);
              try {
                await axios.post(`${API_BASE}/api/auth/request-password-otp`, { identifier: identifier.trim() });
                message.success('OTP sent. Check your email.');
                // Start 60s cooldown and persist across refreshes
                const until = Date.now() + 60 * 1000;
                localStorage.setItem('passwordOtpCooldownUntil', String(until));
                // start/update countdown
                const startCooldown = (target) => {
                  setOtpCooldownUntil(target);
                  const tick = () => {
                    const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
                    setOtpCooldownRemaining(remaining);
                    if (remaining <= 0) {
                      if (otpCooldownIntervalRef.current) {
                        clearInterval(otpCooldownIntervalRef.current);
                        otpCooldownIntervalRef.current = null;
                      }
                      localStorage.removeItem('passwordOtpCooldownUntil');
                      setOtpCooldownUntil(0);
                    }
                  };
                  tick();
                  if (otpCooldownIntervalRef.current) clearInterval(otpCooldownIntervalRef.current);
                  otpCooldownIntervalRef.current = setInterval(tick, 1000);
                };
                startCooldown(until);
                setOtpPhase(2);
              } catch (err) {
                const status = err.response?.status;
                const msg = err.response?.data?.message || 'Failed to request OTP';
                if (status === 404 || /not yet registered/i.test(msg)) {
                  setNotFoundVisible(true);
                  setNotFoundEntering(true);
                  setNotFoundLeaving(false);
                  if (notFoundTimerRef.current) {
                    clearTimeout(notFoundTimerRef.current.enterTimer);
                    clearTimeout(notFoundTimerRef.current.fadeTimer);
                    clearTimeout(notFoundTimerRef.current.unmountTimer);
                  }
                  // trigger enter transition on next tick
                  const enterTimer = setTimeout(() => setNotFoundEntering(false), 20);
                  const fadeTimer = setTimeout(() => setNotFoundLeaving(true), 2000);
                  const unmountTimer = setTimeout(() => setNotFoundVisible(false), 2500);
                  notFoundTimerRef.current = { enterTimer, fadeTimer, unmountTimer };
                } else {
                  message.error(msg);
                }
              } finally {
                setOtpLoading(false);
              }
            }}
          >
            <Alert
              type="info"
              showIcon
              className="mb-4"
              message="Enter your username or exact full name"
              description="If your account has a registered email, we'll send a 6-digit OTP. If no email is on file, you must contact your admin."
            />
            <Form.Item label="Username or Full Name" required>
              <Input
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="e.g. juan.cruz or JUAN DELA CRUZ"
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={otpLoading}
              disabled={otpLoading || otpCooldownRemaining > 0}
              block
            >
              {otpCooldownRemaining > 0 ? `Resend in ${otpCooldownRemaining}s` : 'Send OTP'}
            </Button>
          </Form>
        )}
        {otpPhase === 2 && (
          <Form
            layout="vertical"
            onFinish={async () => {
              if (newPassword !== confirmNewPassword) {
                return message.error('Passwords do not match');
              }
              if (newPassword.length < 6) {
                return message.error('Password must be at least 6 characters');
              }
              setOtpLoading(true);
              try {
                await axios.post(`${API_BASE}/api/auth/verify-password-otp`, {
                  identifier: identifier.trim(),
                  otp: otpCode.trim(),
                  newPassword: newPassword
                });
                message.success('Password changed. You can now log in.');
                setForgotVisible(false);
              } catch (err) {
                const msg = err.response?.data?.message || 'Failed to reset password';
                message.error(msg);
              } finally {
                setOtpLoading(false);
              }
            }}
          >
            <Alert
              type="info"
              showIcon
              className="mb-4"
              message={`OTP sent to your email for ${identifier}`}
              description="Enter the OTP and your new password. OTP expires in 15 minutes."
            />
            <Form.Item label="OTP Code" required>
              <Input
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={6}
                placeholder="6-digit code"
              />
            </Form.Item>
            <Form.Item label="New Password" required>
              <Input.Password
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </Form.Item>
            <Form.Item label="Confirm New Password" required>
              <Input.Password
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                placeholder="Repeat password"
              />
            </Form.Item>
            <div className="flex justify-between gap-2">
              <Button
                onClick={() => setOtpPhase(1)}
                disabled={otpLoading}
              >
                Back
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={otpLoading}
              >
                Change Password
              </Button>
            </div>
          </Form>
        )}
      </Modal>


    </div>
  );
};

export default Login;
