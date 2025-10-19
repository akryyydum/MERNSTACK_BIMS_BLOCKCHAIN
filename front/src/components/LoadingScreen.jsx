import React from "react";

export default function LoadingScreen({ fadingOut }) {
  return (
    <div
      className={`flex min-h-screen items-center justify-center bg-gray-100 transition-opacity duration-500 ${
        fadingOut ? "opacity-0" : "opacity-100"
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