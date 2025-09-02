import React, { useState } from "react";
import axios from "axios";
import { Form, Input, Button, Alert } from "antd";

const Login = () => {
  const [error, setError] = useState("");

  const handleSubmit = async (values) => {
    setError("");
    try {
      const res = await axios.post("/api/auth/login", {
        username: values.username,
        password: values.password,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);

      // Role-based redirect
      if (res.data.role === "admin") {
        window.location.href = "/admin-dashboard";
      } else if (res.data.role === "barangay official") {
        window.location.href = "/official-dashboard";
      } else if (res.data.role === "resident") {
        window.location.href = "/resident-dashboard";
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Left Side - Full Image */}
       <div className="hidden md:block relative w-5/7 h-screen">
    {/* Background Image */}
    <img
      src="/src/assets/bg.jpg" // Change this to your image path
      alt="Barangay"
      className="object-cover w-full h-full"
    />

    {/* Overlay for better text contrast */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

    {/* Text Content */}
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-8xl font-poppins font-extrabold text-white drop-shadow-lg mb-4">
        WELCOME TO <br />LA TORRE NORTH
        </h1>
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-poppins font-semibold text-white drop-shadow-md max-w-2xl">
        Blockchain-Based Barangay Information Management System
        </h2>

    </div>
  </div>
      {/* Right Side - Login Form */}
      <div className="flex w-full md:w-2/7 items-center justify-center ">
        <div className="w-full max-w-md">
            <div className="flex justify-center mb-6">
            <img
              src="/src/assets/logo.png" // change this for logo
              alt="Logo"
              className="h-30 w-30"
            />
          </div>
          <h2 className="text-2xl font-bold mb-6 text-left text-gray-800">Login</h2>
          {error && <Alert message={error} type="error" showIcon className="mb-4" />}
          <Form layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="Username"
              name="username"
              rules={[{ required: true, message: "Please input your username!" }]}
            >
              <Input size="large" />
            </Form.Item>
            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Please input your password!" }]}
            >
              <Input.Password size="large" />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                style={{ backgroundColor: "#000", borderColor: "#000", marginBottom: '7px' }}
                className="w-full hover:bg-gray-800"
                size="large"
              >
                Login
              </Button>
              <br/>
              <Button
                type="default"
                htmlType="button"
                className="w-full hover:bg-gray-200"
                size="large"
              >
                Register
              </Button>
              <div className="flex justify-between mt-4">
                <a href="/forgot-password" className="text-sm text-gray-500 hover:underline">
                  Forgot Password?
                </a>
              </div>
            </Form.Item>
            
          </Form>
          <div className="absolute bottom-4 right-4 items-center w-auto">
            <span className="text-xs text-gray-500">Powered by Blockchain Technology</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;