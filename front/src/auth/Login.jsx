import React, { useState } from "react";
import axios from "axios";
import { Form, Input, Button, Alert, message, Drawer, Steps, Select, DatePicker, Upload } from "antd"; // CHANGED: add Drawer, Steps, Select, DatePicker, Upload

const Login = () => {
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [step, setStep] = useState(1);
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regForm] = Form.useForm();

  // Fields to validate by step (only what's visible)
  const stepFieldNames = {
    1: ["username", "password", "confirmPassword", "firstName", "lastName"],
    // step 2 is optional to avoid blocking on personal info
    2: [],
    // Only enforce contact details on the last step before submit
    3: [
      ["contact", "email"],
      ["contact", "mobile"], // keep mobile if you want it required; remove to make optional
    ],
  };

  // Prefer Vite env variable; fallback to local backend
  const API_BASE =
    import.meta?.env?.VITE_API_URL || "http://localhost:4000";

  const handleSubmit = async (values) => {
    setError("");
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        username: values.username,
        password: values.password,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);

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
      setStep((prev) => prev + 1);
    } catch {
      // keep user on the same step
    }
  };

  const handlePrev = () => setStep((prev) => prev - 1);

  // Helper to close and reset the register panel
  const closeRegisterPanel = () => {
    setShowRegister(false);
    setStep(1);
    setRegError("");
    setVerifyError("");
    setRegLoading(false);
    setVerifyLoading(false);
    setRegEmail("");
    regForm.resetFields();
  };

  // Helper to open the register panel fresh
  const openRegisterPanel = () => {
    setShowRegister(true);
    setStep(1);
    setRegError("");
    setVerifyError("");
    setRegEmail("");
    regForm.resetFields();
  };

  // NEW: open verification directly from Login
  const openVerifyPanel = () => {
    setShowRegister(true);
    setStep(4);
    setVerifyError("");
    // keep regEmail if you have it; user can type email in the field
  };

  // Helper to normalize Upload value for Form
  const normFile = (e) => { // NEW
    if (Array.isArray(e)) return e;
    return e?.fileList || [];
  };

  // Registration submit handler
  const handleRegister = async () => {
    setRegError("");
    setRegLoading(true);
    try {
      // Read all current form values, including unmounted preserved fields
      const values = regForm.getFieldsValue(true); // NEW

      // Build fullName and normalize
      const fullName = [values.firstName, values.middleName, values.lastName, values.suffix]
        .filter(Boolean)
        .join(" ")
        .trim();

      const email = values?.contact?.email?.trim();
      const username = values?.username?.trim();
      const password = values?.password;

      // Frontend guard for required fields
      if (!username || !password || !fullName || !email) { // NEW
        setRegError("username, password, fullName, and contact.email are required");
        // Navigate to the step that likely misses data
        if (!username || !password || !values.firstName || !values.lastName) setStep(1);
        else if (!values.dateOfBirth || !values.birthPlace || !values.gender || !values.civilStatus) setStep(2);
        else setStep(3);
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
        dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD"), // convert Dayjs to string
        birthPlace: values.birthPlace,
        gender: values.gender,
        civilStatus: values.civilStatus,
        religion: values.religion,
        address: {
          street: values?.address?.street,
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
        education: values.education,
        role: "resident",
      };


      await axios.post(`${API_BASE}/api/auth/register`, payload);
      message.success("Verification code sent to your email. Enter it to verify.");
      setRegEmail(email);
      regForm.setFieldsValue({ verifyEmail: email }); // NEW: prefill verify email
      setStep(4);
    } catch (err) {
      const status = err.response?.status;
      const msg =
        status === 503
          ? "Service temporarily unavailable. Please try again later."
          : status >= 500
          ? "Server error. Please try again later."
          : err.response?.data?.message || "Registration failed";
      setRegError(msg);
    } finally {
      setRegLoading(false);
    }
  };

  // NEW: resend code
  const handleResendCode = async () => {
    try {
      const email = regForm.getFieldValue("verifyEmail")?.trim() || regEmail;
      if (!email) {
        setVerifyError("Please enter your email to resend the code.");
        return;
      }
      await axios.post(`${API_BASE}/api/auth/resend-code`, { email });
      message.success("A new code has been sent to your email.");
    } catch (err) {
      const status = err.response?.status;
      const msg =
        status === 404
          ? "Email not found."
          : status === 400
          ? err.response?.data?.message || "Cannot resend code."
          : status >= 500
          ? "Server error. Please try again later."
          : err.response?.data?.message || "Failed to resend code.";
      setVerifyError(msg);
    }
  };

  // NEW: verification submit handler
  const handleVerify = async () => {
    setVerifyError("");
    setVerifyLoading(true);
    try {
      await regForm.validateFields(["verifyEmail", "verifyCode"]); // CHANGED: also validate email
      const email = regForm.getFieldValue("verifyEmail")?.trim() || regEmail;
      const code = regForm.getFieldValue("verifyCode");
      await axios.post(`${API_BASE}/api/auth/verify-code`, { email, code });
      message.success("Email verified. You can now log in.");
      closeRegisterPanel();
    } catch (err) {
      if (!err?.errorFields) {
        const status = err.response?.status;
        const msg =
          status === 503
            ? "Service temporarily unavailable. Please try again later."
            : status >= 500
            ? "Server error. Please try again later."
            : err.response?.data?.message || "Verification failed";
        setVerifyError(msg);
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 relative overflow-hidden">
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
              label="Username"
              name="username"
              rules={[
                { required: true, message: "Please input your username!" },
              ]}
            >
              <Input size="large" />
            </Form.Item>
            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: "Please input your password!" },
              ]}
            >
              <Input.Password size="large" />
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
          Register Now!
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


  {/* Forgot Password Link */}
  <div className="flex justify-between mt-4">
    <a
      href="/forgot-password"
      className="text-sm text-gray-500 hover:underline"
    >
      Forgot Password?
    </a>
    <button
      type="button"
      onClick={openVerifyPanel}
      className="text-sm text-gray-500 hover:underline"
    >
      Verify Email
    </button>
  </div>
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
        title={step <= 3 ? "Resident Registration" : "Verify Your Email"} // NEW
        placement="right"
        onClose={closeRegisterPanel}
        open={showRegister}
        width={480} // NEW: panel width
        destroyOnClose={false}
        maskClosable={!regLoading && !verifyLoading}
      >
        {/* Step indicator or verify hint */}
        {step <= 3 ? (
          <div className="mb-4">
            <Steps
              size="small"
              current={step - 1}
              items={[
                { title: "Account" },
                { title: "Personal" },
                { title: "Address & Contact" },
              ]}
            />
          </div>
        ) : (
          <Alert
            type="info"
            showIcon
            className="mb-3"
            message={`Enter the 6-digit code sent to ${regEmail || "your email"}.`}
          />
        )}

        <div className="w-full max-w-sm mx-auto">
          {regError && step <= 3 && <Alert message={regError} type="error" showIcon className="mb-3" />}
          {verifyError && step === 4 && <Alert message={verifyError} type="error" showIcon className="mb-3" />}

          <Form
            form={regForm}
            layout="vertical"
             preserve={true}
            onFinish={handleRegister}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && step !== 4) e.preventDefault();
            }}
          >
            {/* STEP 1: Account & Name */}
            {step === 1 && (
              <>
                <h3 className="text-sm font-semibold mb-2">Account</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Username" name="username" rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item label="Password" name="password" rules={[{ required: true, min: 6 }]} className="mb-2">
                    <Input.Password size="middle" />
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
                    <Input.Password size="middle" />
                  </Form.Item>
                </div>

                <h3 className="text-sm font-semibold mt-4 mb-2">Name</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="First Name" name="firstName" rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item label="Middle Name" name="middleName" className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item label="Last Name" name="lastName" rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item label="Suffix" name="suffix" className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                </div>
              </>
            )}

            {/* STEP 2: Personal Info */}
            {step === 2 && (
              <>
                <h3 className="text-sm font-semibold mb-2">Personal Info</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Date of Birth" name="dateOfBirth" className="mb-2">
                    <DatePicker className="w-full" size="middle" />
                  </Form.Item>
                  <Form.Item label="Birth Place" name="birthPlace" className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Gender" name="gender" className="mb-2">
                    <Select
                      options={[
                        { value: "male", label: "Male" },
                        { value: "female", label: "Female" },
                        { value: "other", label: "Other" },
                      ]}
                      size="middle"
                    />
                  </Form.Item>
                  <Form.Item label="Civil Status" name="civilStatus" className="mb-2">
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
                <Form.Item label="Religion" name="religion" className="mb-2">
                  <Input size="middle" />
                </Form.Item>
              </>
            )}

            {/* STEP 3: Address & Contact */}
            {step === 3 && (
              <>
                <h3 className="text-sm font-semibold mb-2">Address</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Street" name={["address", "street"]} rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item label="Barangay" name={["address", "barangay"]} rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item label="Municipality" name={["address", "municipality"]} rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item label="Province" name={["address", "province"]} rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item label="ZIP Code" name={["address", "zipCode"]} className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Form.Item label="Citizenship" name="citizenship" rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item label="Occupation" name="occupation" rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item label="Education" name="education" rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                </div>

                <h3 className="text-sm font-semibold mt-4 mb-2">Contact</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Mobile" name={["contact", "mobile"]} rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item label="Email" name={["contact", "email"]} rules={[{ required: true, type: "email" }]} className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                </div>

                <Form.Item
                  label="Upload Valid ID"
                  name="idFiles"
                  valuePropName="fileList"
                  getValueFromEvent={normFile}
                  className="mb-2"
                >
                  <Upload.Dragger multiple beforeUpload={() => false}>
                    <p className="ant-upload-drag-icon">+</p>
                    <p className="ant-upload-text">Click or drag files to this area to upload</p>
                    <p className="ant-upload-hint">Only for verification; not sent to backend yet.</p>
                  </Upload.Dragger>
                </Form.Item>
              </>
            )}

            {/* STEP 4: Verification */}
            {step === 4 && (
              <>
                <Form.Item
                  label="Email"
                  name="verifyEmail"
                  initialValue={regEmail || undefined} // NEW: allow typing email
                  rules={[{ required: true, type: "email", message: "Please enter a valid email" }]}
                  className="mb-2"
                >
                  <Input size="middle" placeholder="your@email.com" />
                </Form.Item>
                <Form.Item
                  label="Verification Code"
                  name="verifyCode"
                  rules={[{ required: true, message: "Please enter the 6-digit code" }]}
                  className="mb-2"
                >
                  <Input size="middle" maxLength={6} placeholder="Enter 6-digit code" />
                </Form.Item>
                <div className="flex justify-end">
                  <Button type="link" onClick={handleResendCode}>Resend code</Button>
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="mt-4 flex gap-2">
              {step > 1 && step <= 3 && (
                <button onClick={handlePrev} className="cssbuttons-io-button-left flex-1 w-full">
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
              {step < 3 && (
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
                <Button
                  type="primary"
                  onClick={handleRegister}
                  loading={regLoading}
                  className="flex-1 bg-black hover:bg-gray-800"
                >
                  Submit Registration
                </Button>
              )}
              {step === 4 && (
                <>
                  <Button
                    type="primary"
                    onClick={handleVerify}
                    loading={verifyLoading}
                    className="flex-1 bg-black hover:bg-gray-800"
                  >
                    Verify
                  </Button>
                  <Button
                    type="default"
                    onClick={closeRegisterPanel}
                    className="flex-1 border-gray-400"
                    disabled={verifyLoading}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </Form>
        </div>
      </Drawer>

    </div>
  );
};

export default Login;
