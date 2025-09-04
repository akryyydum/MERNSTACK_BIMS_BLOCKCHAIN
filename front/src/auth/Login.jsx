import React, { useState } from "react";
import axios from "axios";
import { Form, Input, Button, Alert, message, Drawer, Steps, Select, DatePicker, Upload } from "antd";

const Login = () => {
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [step, setStep] = useState(1);
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regForm] = Form.useForm();

  const stepFieldNames = {
    1: [
      "firstName","middleName","lastName","dateOfBirth","birthPlace","gender","civilStatus","religion"
    ],
    2: [
      ["address","street"],["address","barangay"],["address","municipality"],["address","province"],["address","zipCode"],
      "citizenship","occupation","education",["contact","mobile"],["contact","email"]
    ],
    3: [
      "username",
      "password",
      "confirmPassword"
    ]
  };

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
        await regForm.validateFields(fields); 
      }
      setRegError("");
      setStep((prev) => prev + 1);
    } catch (err) {
      if (err && err.errorFields && err.errorFields.length > 0) {
        const firstError = err.errorFields[0];
        if (firstError && firstError.name) {
          regForm.scrollToField(firstError.name);
        }
        const missing = err.errorFields.map(f => {
          const name = Array.isArray(f.name) ? f.name[f.name.length-1] : f.name;
          return name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, s => s.toUpperCase());
        });
        setRegError(`Please fill in the following required field(s): ${missing.join(", ")}`);
      }
    }
  };

  const handlePrev = () => setStep((prev) => prev - 1);

  const closeRegisterPanel = () => {
    setShowRegister(false);
    setStep(1);
    setRegError("");
    setRegLoading(false);
    regForm.resetFields();
  };

  const openRegisterPanel = () => {
    setShowRegister(true);
    setStep(1);
    setRegError("");
    regForm.resetFields();
  };

  const normFile = (e) => { // NEW
    if (Array.isArray(e)) return e;
    return e?.fileList || [];
  };

  const handleRegister = async () => {
    setRegError("");
    setRegLoading(true);
    try {
      const values = regForm.getFieldsValue(true);

      const fullName = [values.firstName, values.middleName, values.lastName, values.suffix]
        .filter(Boolean)
        .join(" ")
        .trim();

      const email = values?.contact?.email?.trim();
      const password = values?.password;
      const username = values?.username?.trim(); 

      if (!password || !fullName || !email || !username) { // <-- include username
        setRegError("Username, password, full name, and contact email are required");
        return;
      }

      const payload = {
        username, // <-- add
        password,
        fullName,
        // Name fields needed by Resident
        firstName: values.firstName,
        middleName: values.middleName,
        lastName: values.lastName,
        suffix: values.suffix,
        dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD"),
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
      message.success("Registration successful. You can now log in.");
      closeRegisterPanel();
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
  <div className="flex justify-center mt-4">
    <a
      href="/forgot-password"
      className="text-sm text-gray-500 hover:underline"
    >
      Forgot Password?
    </a>
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

      {/* Registration*/}
      <Drawer
        title="Resident Registration" 
        placement="right"
        onClose={closeRegisterPanel}
        open={showRegister}
        width={480} 
        destroyOnClose={false}
        maskClosable={!regLoading}
      >
        <div className="mb-4">
          <Steps
            size="small"
            current={step - 1}
            items={[
              { title: "Personal" },
              { title: "Address & Contact" },
              { title: "Account" },
            ]}
          />
        </div>

        <div className="w-full max-w-sm mx-auto">
          {regError && <Alert message={regError} type="error" showIcon className="mb-3" />}

          <Form
            form={regForm}
            layout="vertical"
            preserve={true}
            onFinish={handleRegister}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault();
            }}
            onValuesChange={(changed, all) => {
              if (changed?.contact?.email !== undefined) {
                regForm.setFieldsValue({ accountEmail: changed.contact.email });
              }
            }}
          >
            {step === 1 && (
              <>
                <h3 className="text-sm font-semibold mb-2">Personal Info</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Form.Item
                    label="First Name"
                    name="firstName"
                    rules={[
                      { required: true, message: 'First name is required' },
                      { pattern: /^[A-Za-z ]+$/, message: 'First name must contain only letters and spaces' }
                    ]}
                    className="mb-2"
                  >
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item
                    label="Middle Name"
                    name="middleName"
                    rules={[
                      { pattern: /^[A-Za-z ]*$/, message: 'Middle name must contain only letters and spaces' }
                    ]}
                    className="mb-2"
                  >
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item
                    label="Last Name"
                    name="lastName"
                    rules={[
                      { required: true, message: 'Last name is required' },
                      { pattern: /^[A-Za-z ]+$/, message: 'Last name must contain only letters and spaces' }
                    ]}
                    className="mb-2"
                  >
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item label="Suffix" name="suffix" className="mb-2">
                    <Input size="middle" />
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
                    <Input size="middle" />
                  </Form.Item>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Gender" name="gender" rules={[{ required: true }]} className="mb-2">
                    <Select
                      options={[ 
                        { value: "male", label: "Male" },
                        { value: "female", label: "Female" },
                        { value: "other", label: "Prefer not to say" },
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
                    { required: true, message: 'Religion is required' },
                    { pattern: /^[A-Za-z ]+$/, message: 'Religion must contain only letters and spaces' }
                  ]}
                  className="mb-2"
                >
                  <Input size="middle" />
                </Form.Item>
              </>
            )}

            {/* STEP 2: Address & Contact */}
            {step === 2 && (
              <>
                <h3 className="text-sm font-semibold mb-2">Address</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item label="Street" name={["address", "street"]} rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" />
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

                <div className="grid grid-cols-3 gap-2">
                  <Form.Item label="Citizenship" name="citizenship" rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item label="Occupation" name="occupation" rules={[{ required: true }]} className="mb-2">
                    <Input size="middle" />
                  </Form.Item>
                  <Form.Item label="Education" name="education" rules={[{ required: true }]} className="mb-2">
                    <Select
                      options={[
                        { value: "Elementary", label: "Elementary" },
                        { value: "High School", label: "High School" },
                        { value: "Senior High School", label: "Senior High School" },
                        { value: "Vocational", label: "Vocational" },
                        { value: "College", label: "College" },
                        { value: "Post Graduate", label: "Post Graduate" },
                        { value: "Doctorate", label: "Doctorate" },
                        { value: "None", label: "None" }
                      ]}
                      size="middle"
                      placeholder="Select education level"
                    />
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
                      return false;
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
                    <Input size="middle" autoComplete="off" />
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
              </>
            )}

            {/* Navigation Buttons */}
            <div className="mt-4 flex gap-2">
              {step > 1 && (
                <button
                  onClick={() => {
                    if (step === 3) setStep(2);
                    else handlePrev();
                  }}
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
                  className="flex-1 bg-black hover:bg-gray-800 h-64"
                >
                  Submit Registration
                </Button>
              )}
            </div>
          </Form>
        </div>
      </Drawer>

    </div>
  );
};

export default Login;
